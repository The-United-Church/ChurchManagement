import { User } from "../models/user.model";
import { Denomination as Church } from "../models/church";
import { AppDataSource } from "../config/database";
import { firebaseAuth } from "../config/firebase.admin";
import bcrypt from "bcrypt";
import * as speakeasy from "speakeasy";
import { sendPasswordResetOtpEmail } from "../email/sendPasswordResetOtpEmail";
import { TokenService } from "./token.service";
import { GoogleAuthService, GoogleProfile } from "./google-auth.service";
import CustomError from "../utils/customError";

type UserResponse = Omit<
  User,
  "password_hash" | "otp_hash" | "hashPassword" | "validatePassword"
>;

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface ChurchFields {
  denomination_name: string;
  description?: string;
  location?: string;
  state?: string;
  country?: string;
  address?: string;
}

export class AuthService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly churchRepository = AppDataSource.getRepository(Church);
  private readonly tokenService = new TokenService();
  private readonly googleAuthService = new GoogleAuthService();

  private async isFirstUser(): Promise<boolean> {
    const userCount = await this.userRepository.count();
    return userCount === 0;
  }

  private stripSensitiveFields(user: User): UserResponse {
    const {
      password_hash: _,
      otp_hash: __,
      otp_secret: ___,
      reset_password_token: ____,
      refresh_token_hash: _____,
      ...safe
    } = user;
    return safe as UserResponse;
  }

  private async saveRefreshToken(user: User, refreshToken: string): Promise<void> {
    user.refresh_token_hash = this.tokenService.hashToken(refreshToken);
    await this.userRepository.save(user);
  }

  private async findUserWithRelations(where: Record<string, any>): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where,
        relations: ["groups", "department"],
      });
    } catch (error: any) {
      return await this.userRepository.findOne({ where });
    }
  }


  async register(
    idToken: string,
    full_name: string,
    church: ChurchFields,
    phone_number?: string
  ): Promise<{ user: UserResponse; church: Church; tokens: AuthTokens }> {
    if (!idToken || !full_name) {
      throw new Error("All fields are required");
    }

    // Verify Firebase ID token to get email
    const decoded = await firebaseAuth.verifyIdToken(idToken);
    const email = decoded.email;
    if (!email) throw new Error("Firebase token missing email");

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Check for duplicate denomination name (case-insensitive)
    const existingDenom = await this.churchRepository
      .createQueryBuilder('d')
      .where('LOWER(d.denomination_name) = LOWER(:name)', { name: church.denomination_name.trim() })
      .getOne();
    if (existingDenom) {
      throw new Error(`A denomination named "${church.denomination_name.trim()}" is already registered. If this is your church, please log in instead.`);
    }

    const isFirst = await this.isFirstUser();

    const user = this.userRepository.create({
      email: email.toLowerCase().trim(),
      full_name: full_name.trim(),
      phone_number: phone_number?.trim() || undefined,
      role: isFirst ? 'super_admin' : 'admin',
    });

    const savedUser = await this.userRepository.save(user);
    const completeUser = await this.findUserWithRelations({ id: savedUser.id });
    if (!completeUser) throw new Error("Failed to fetch complete user data");

    const newChurch = this.churchRepository.create({
      denomination_name: church.denomination_name.trim(),
      description: church.description?.trim(),
      location: church.location?.trim(),
      state: church.state?.trim(),
      country: church.country?.trim(),
      address: church.address?.trim(),
      admin_id: savedUser.id,
    });
    const savedChurch = await this.churchRepository.save(newChurch);

    // Link the user as a member of their denomination
    const userForMembership = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ["denominations"],
    });
    if (userForMembership) {
      userForMembership.denominations = [savedChurch];
      await this.userRepository.save(userForMembership);
    }

    const tokens = this.tokenService.generateTokenPair(completeUser);
    await this.saveRefreshToken(completeUser, tokens.refreshToken);

    return { user: this.stripSensitiveFields(completeUser), church: savedChurch, tokens };
  }

  async registerMember(
    idToken: string,
    full_name: string
  ): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    if (!idToken || !full_name) {
      throw new Error("All fields are required");
    }

    const decoded = await firebaseAuth.verifyIdToken(idToken);
    const email = decoded.email;
    if (!email) throw new Error("Firebase token missing email");

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) throw new Error("User with this email already exists");

    const isFirst = await this.isFirstUser();

    const user = this.userRepository.create({
      email: email.toLowerCase().trim(),
      full_name: full_name.trim(),
      role: isFirst ? 'super_admin' : 'member',
    });

    const savedUser = await this.userRepository.save(user);
    const completeUser = await this.findUserWithRelations({ id: savedUser.id });
    if (!completeUser) throw new Error("Failed to fetch complete user data");

    const tokens = this.tokenService.generateTokenPair(completeUser);
    await this.saveRefreshToken(completeUser, tokens.refreshToken);

    return { user: this.stripSensitiveFields(completeUser), tokens };
  }

  async firebaseLogin(
    idToken: string
  ): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const decoded = await firebaseAuth.verifyIdToken(idToken);
    const email = decoded.email;
    if (!email) throw new Error("Firebase token missing email");

    const user = await this.findUserWithRelations({ email });
    if (!user) throw new Error("No account found for this email. Please register first.");
    if (!user.is_active) throw new Error("Account is deactivated. Please contact an administrator.");

    const tokens = this.tokenService.generateTokenPair(user);
    await this.saveRefreshToken(user, tokens.refreshToken);

    return { user: this.stripSensitiveFields(user), tokens };
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const user = await this.findUserWithRelations({ email });
    if (!user) throw new Error("Invalid email or password.");
    if (!user.password_hash) throw new Error("Password not set for this account.");

    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) throw new Error("Invalid email or password");
    if (!user.is_active) throw new Error("Account is deactivated. Please contact an administrator.");

    const tokens = this.tokenService.generateTokenPair(user);
    await this.saveRefreshToken(user, tokens.refreshToken);

    return { user: this.stripSensitiveFields(user), tokens };
  }

  async googleSignIn(
    idToken: string
  ): Promise<{ user: UserResponse; tokens: AuthTokens; isNewUser: boolean }> {
    const profile = await this.googleAuthService.verifyIdToken(idToken);
    let user = await this.findUserWithRelations({ google_id: profile.googleId });
    let isNewUser = false;

    if (!user) {
      user = await this.findUserWithRelations({ email: profile.email });
      if (user) {
        user.google_id = profile.googleId;
        if (!user.profile_img && profile.profileImg) {
          user.profile_img = profile.profileImg;
        }
        await this.userRepository.save(user);
      }
    }

    if (!user) {
      user = await this.createGoogleUser(profile);
      isNewUser = true;
    }

    if (!user.is_active) throw new Error("Account is deactivated.");

    const tokens = this.tokenService.generateTokenPair(user);
    await this.saveRefreshToken(user, tokens.refreshToken);

    return { user: this.stripSensitiveFields(user), tokens, isNewUser };
  }

  private async createGoogleUser(profile: GoogleProfile): Promise<User> {
    const isFirst = await this.isFirstUser();
    const newUser = this.userRepository.create({
      email: profile.email.toLowerCase().trim(),
      full_name: profile.fullName,
      first_name: profile.firstName,
      last_name: profile.lastName,
      google_id: profile.googleId,
      profile_img: profile.profileImg,
      is_active: true,
      role: isFirst ? 'super_admin' : 'member',
    });
    const savedUser = await this.userRepository.save(newUser);
    return (await this.findUserWithRelations({ id: savedUser.id }))!;
  }

  async refreshTokens(
    refreshToken: string
  ): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.findUserWithRelations({ id: payload.id });
    if (!user) throw new Error("User not found");
    if (!user.is_active) throw new Error("Account is deactivated.");

    const tokenHash = this.tokenService.hashToken(refreshToken);
    if (user.refresh_token_hash !== tokenHash) {
      throw new Error("Invalid refresh token");
    }

    const tokens = this.tokenService.generateTokenPair(user);
    await this.saveRefreshToken(user, tokens.refreshToken);

    return { user: this.stripSensitiveFields(user), tokens };
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.refresh_token_hash = "";
      await this.userRepository.save(user);
    }
  }

  async verifyTwoFactorCode(
    email: string,
    code: string
  ): Promise<{ tokens: AuthTokens; user: UserResponse }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user || !user.two_factor_code) {
      throw new Error("Invalid email or no 2FA code requested.");
    }
    if (new Date() > user.two_factor_code_expires_at!) {
      throw new Error("2FA code has expired.");
    }

    const isValid = await bcrypt.compare(code, user.two_factor_code);
    if (!isValid) throw new Error("Invalid 2FA code.");
    if (!user.is_active) throw new Error("Account is deactivated.");

    user.two_factor_code = null;
    user.two_factor_code_expires_at = null;
    await this.userRepository.save(user);

    const tokens = this.tokenService.generateTokenPair(user);
    await this.saveRefreshToken(user, tokens.refreshToken);

    return { tokens, user: this.stripSensitiveFields(user) };
  }

  async initiatePasswordReset(email: string): Promise<{ otpSent: boolean }> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      return { otpSent: true };
    }

    // Generate OTP
    const otpSecret = speakeasy.generateSecret({ length: 20 });
    const otp = speakeasy.totp({
      secret: otpSecret.base32,
      encoding: "base32",
    });
    const otpHash = await bcrypt.hash(otp, 10);

    user.otp_secret = otpSecret.base32;
    user.otp_hash = otpHash;
    await this.userRepository.save(user);

    // Log OTP for debugging (remove in production)
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`🔐 OTP GENERATED FOR PASSWORD RESET`);
    console.log(`   Email: ${email}`);
    console.log(`   OTP Code: ${otp}`);
    console.log(`   OTP Hash: ${otpHash.substring(0, 20)}...`);
    console.log(`   Expires in: 10 minutes`);
    console.log(`═══════════════════════════════════════════════════════════\n`);

    let emailSent = false;
    try {
      console.log(`📧 Sending password reset email to: ${email}`);
      const emailResult = await sendPasswordResetOtpEmail(email, otp);
      if (emailResult) {
        emailSent = true;
        console.log(`✅ Password reset email sent successfully to: ${email}`);
      } else {
        console.error('❌ Email service returned null - email was not sent');
        console.error('   This usually means SMTP ports are blocked by firewall/network');
        console.error(`   OTP Code: ${otp} (use this code to reset password)`);
      }
    } catch (error: any) {
      console.error('❌ Failed to send password reset email:', error);
      console.error('   Error details:', {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
      });
      console.error(`   OTP Code: ${otp} (use this code to reset password)`);
    }

    return { otpSent: emailSent };
  }

    async verifyPasswordResetOtp(email: string, otp: string): Promise<{ isValid: boolean }> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.otp_hash) {
      throw new Error("No OTP requested for this user");
    }

    const isValidOtp = await bcrypt.compare(otp, user.otp_hash);
    return {
      isValid: isValidOtp,
    };
  }

  async setNewPassword(email: string, newPassword: string): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new Error("User not found");
    }
    if (!user.otp_hash) {
      throw new Error("OTP verification required");
    }
    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }
    // Update (or create) the password in Firebase so the Firebase login path stays in sync
    try {
      const firebaseUser = await firebaseAuth.getUserByEmail(email);
      await firebaseAuth.updateUser(firebaseUser.uid, { password: newPassword });
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        // User exists in DB but has no Firebase account — create one so Firebase login works
        await firebaseAuth.createUser({ email, password: newPassword });
      } else {
        throw err;
      }
    }

    user.otp_hash = "";
    user.otp_secret = "";
    await this.userRepository.save(user);
    return { success: true };
  }

  private async verifyFirebasePassword(email: string, password: string): Promise<boolean> {
    const apiKey = process.env.DOMAIN_FIREBASE_API_KEY;
    if (!apiKey) {
      throw new CustomError("Firebase API key is not configured", 500);
    }

    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: false,
        }),
      }
    );

    if (resp.ok) return true;

    let code = "";
    try {
      const body: any = await resp.json();
      code = body?.error?.message || "";
    } catch {
      code = "";
    }

    if (
      code.includes("INVALID_PASSWORD") ||
      code.includes("INVALID_LOGIN_CREDENTIALS") ||
      code.includes("EMAIL_NOT_FOUND")
    ) {
      return false;
    }

    throw new CustomError("Failed to verify old password with Firebase", 500);
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    if (!user.email) {
      throw new CustomError("User email is missing", 400);
    }

    const isValid = await this.verifyFirebasePassword(user.email, oldPassword);
    if (!isValid) {
      throw new CustomError("Old password is incorrect", 401);
    }

    if (newPassword.length < 6) {
      throw new CustomError("New password must be at least 6 characters long", 400);
    }

    try {
      const firebaseUser = await firebaseAuth.getUserByEmail(user.email);
      await firebaseAuth.updateUser(firebaseUser.uid, { password: newPassword });
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") {
        await firebaseAuth.createUser({
          uid: user.id,
          email: user.email,
          password: newPassword,
          displayName: user.full_name || undefined,
        });
      } else {
        throw new CustomError(`Failed to update Firebase password: ${err?.message || "Unknown error"}`, 500);
      }
    }

    return { success: true };
  }
}
