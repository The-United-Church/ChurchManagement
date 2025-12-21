import { User } from "../models/user.model";
import { AppDataSource } from "../config/database";
import * as jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import * as speakeasy from "speakeasy";
import { sendPasswordResetOtpEmail } from "../email/sendPasswordResetOtpEmail";
import { Role } from "../models/role-permission/role.model";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
type UserResponse = Omit<
  User,
  "password_hash" | "otp_hash" | "hashPassword" | "validatePassword"
>;

export class AuthService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private async isFirstUser(): Promise<boolean> {
  const userRepo = AppDataSource.getRepository(User);
  const userCount = await userRepo.count();
  return userCount === 0;
}


  async register(
    email: string,
    full_name: string,
    password: string
  ): Promise<{ user: UserResponse; token: string }> {
    try {
      // Validate input
      if (!email || !full_name || !password) {
        throw new Error("All fields are required");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      const existingUser = await this.userRepository.findOne({
        where: [{ email }],
        relations: ["role"]
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      const isAdmin = await this.isFirstUser();
      const roleRepository = AppDataSource.getRepository(Role);

      // For first user, they must be admin. Find admin role with permissions.
      // Admin role should be seeded before first user registration.
      const roleName = "admin"; // First user is always admin
      let role = await roleRepository.findOne({ 
        where: { name: roleName },
        relations: ["permissions"]
      });

      if (!role) {
        throw new Error("Admin role not found. Please run seed scripts (npm run seed:permissions && npm run seed:roles) before creating the first user.");
      }

      // Ensure role has permissions
      if (!role.permissions || role.permissions.length === 0) {
        throw new Error("Admin role exists but has no permissions. Please run seed:roles to assign permissions.");
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user entity with admin role
      const user = this.userRepository.create({
        email: email.toLowerCase().trim(),
        full_name: full_name.trim(),
        password_hash: passwordHash,
        role: role,
      });

      // Save user to database
      const savedUser = await this.userRepository.save(user);

      // Fetch the complete user data with all relations
      // Note: groups relation is optional - table may not exist yet
      let completeUser: User | null;
      try {
        // Try to load with groups first
        completeUser = await this.userRepository.findOne({
          where: { id: savedUser.id },
          relations: ["role", "role.permissions", "groups", "groups.permissions", "permissions", "department"]
        });
      } catch (error: any) {
        // If groups table doesn't exist, load without groups
        if (error?.code === '42P01' || error?.message?.includes('user_groups')) {
          console.log("Groups table not available, loading user without groups relation");
          completeUser = await this.userRepository.findOne({
            where: { id: savedUser.id },
            relations: ["role", "role.permissions", "permissions", "department"]
          });
        } else {
          throw error;
        }
      }

      if (!completeUser) {
        throw new Error("Failed to fetch complete user data");
      }

      const {
        password_hash: _,
        otp_hash: __,
        otp_secret: ___,
        reset_password_token: ____,
        ...userWithoutSensitive
      } = completeUser;

      const token = this.generateToken(savedUser);

      return { user: userWithoutSensitive as UserResponse, token };
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    // Try to load with groups, but fallback if table doesn't exist
    let user: User | null;
    try {
      // Try to load with groups first
      user = await this.userRepository.findOne({ 
        where: { email },
        relations: ["role", "role.permissions", "groups", "groups.permissions", "permissions", "department"]
      });
    } catch (error: any) {
      // If groups table doesn't exist, load without groups
      if (error?.code === '42P01' || error?.message?.includes('user_groups')) {
        console.log("Groups table not available, loading user without groups relation");
        user = await this.userRepository.findOne({ 
          where: { email },
          relations: ["role", "role.permissions", "permissions", "department"]
        });
      } else {
        throw error;
      }
    }
    console.log("user: ", user);
    if (!user) {
      throw new Error("Invalid email or password.");
    }

    if (!user.password_hash) {
      throw new Error("Password not set for this account.");
    }
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error("Account is deactivated. Please contact an administrator.");
    }

    const token = this.generateToken(user);

    return { user, token };
  }

  async verifyTwoFactorCode(
    email: string,
    code: string
  ): Promise<{ token: string; user: UserResponse }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user || !user.two_factor_code) {
      throw new Error("Invalid email or no 2FA code requested.");
    }

    if (new Date() > user.two_factor_code_expires_at!) {
      throw new Error("2FA code has expired.");
    }

    const isValid = await bcrypt.compare(code, user.two_factor_code);
    if (!isValid) {
      throw new Error("Invalid 2FA code.");
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error("Account is deactivated. Please contact an administrator.");
    }

    // Clear 2FA code after successful verification
    user.two_factor_code = null;
    user.two_factor_code_expires_at = null;
    await this.userRepository.save(user);

    const token = this.generateToken(user);
    const {
      password_hash: password,
      otp_hash: otp_hash,
      ...userWithoutSensitiveData
    } = user;

    return {
      token,
      user: userWithoutSensitiveData,
    };
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

  private generateToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "2400h" }
    );
  }
  /**
   * Set a new password for a user after OTP verification
   */
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
    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.otp_hash = "";
    user.otp_secret = "";
    await this.userRepository.save(user);
    return { success: true };
  }
  /**
   * Change password for authenticated user
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }
    const isValid = await user.validatePassword(oldPassword);
    if (!isValid) {
      throw new Error("Old password is incorrect");
    }
    if (newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }
    user.password_hash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);
    return { success: true };
  }
}
