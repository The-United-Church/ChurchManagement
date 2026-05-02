import { Request, Response } from "express";
import crypto from "crypto";
import { AuthService } from "../services/auth/auth.service";
import { GoogleAuthService } from "../services/auth/google-auth.service";
import asyncHandler from "../utils/asyncHandler";
import { AuthRequest } from "../middleware/auth.middleware";
import { getPermissionsForRole } from "../utils/roles";
import { logActivity } from "../utils/activityLogger";
import { ActivityAction, EntityType } from "../models/activity-log.model";
import { autoJoinFromCustomDomain } from "../services/auth/domain-auth.service";

const authService = new AuthService();
const googleAuthService = new GoogleAuthService();

const STATE_SECRET = process.env.JWT_SECRET || process.env.TOKEN_SECRET_KEY || "google-state-secret";

/** Sign a `return_to` URL into a tamper-proof state string for the OAuth code flow. */
function signGoogleState(returnTo: string): string {
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = JSON.stringify({ r: returnTo, n: nonce, t: Date.now() });
  const data = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", STATE_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

/** Verify and decode a state string from the Google OAuth callback. */
function verifyGoogleState(state: string): { returnTo: string } | null {
  if (!state || typeof state !== "string" || !state.includes(".")) return null;
  const [data, sig] = state.split(".");
  const expected = crypto.createHmac("sha256", STATE_SECRET).update(data).digest("base64url");
  if (sig !== expected) return null;
  try {
    const { r, t } = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    // Reject states older than 10 minutes
    if (typeof t !== "number" || Date.now() - t > 10 * 60 * 1000) return null;
    if (typeof r !== "string" || !/^https?:\/\//i.test(r)) return null;
    return { returnTo: r };
  } catch {
    return null;
  }
}

function setTokenHeaders(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.setHeader('X-Access-Token', tokens.accessToken);
  res.setHeader('X-Refresh-Token', tokens.refreshToken);
}

function buildAuthResponse(result: { user: any; tokens: any }) {
  const roleName = result.user.role || 'member';
  const permissions = getPermissionsForRole(roleName);

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      full_name: result.user.full_name,
      profile_img: result.user.profile_img,
    },
    role: roleName,
    permissions,
  };
}

export const register = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { idToken, full_name, phone_number, denomination_name, description, location, state, country, address } = req.body;
    if (!idToken || !full_name) {
      res.status(400).json({
        status: 400,
        message: "All fields are required: idToken, full_name",
      });
      return;
    }

    if (denomination_name) {
      // Register with church (creates an admin account + denomination)
      const result = await authService.register(idToken, full_name, {
        denomination_name,
        description,
        location,
        state,
        country,
        address,
      }, phone_number);

      const roleName = result.user.role || 'admin';
      const permissions = getPermissionsForRole(roleName as string);
      setTokenHeaders(res, result.tokens);

      logActivity(
        result.user.id, ActivityAction.REGISTER, EntityType.AUTH, result.user.id,
        `User "${result.user.full_name}" registered with church "${result.church.denomination_name}"`,
        { email: result.user.email, church: result.church.denomination_name }
      );

      res.status(201).json({
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            full_name: result.user.full_name,
            profile_img: result.user.profile_img,
          },
          church: {
            id: result.church.id,
            denomination_name: result.church.denomination_name,
            description: result.church.description,
            location: result.church.location,
            state: result.church.state,
            country: result.church.country,
            address: result.church.address,
          },
          role: roleName,
          permissions,
        },
        status: 201,
        message: "Registration successful.",
      });
    } else {
      // Register without church (creates a member account)
      const result = await authService.registerMember(idToken, full_name);
      setTokenHeaders(res, result.tokens);

      logActivity(
        result.user.id, ActivityAction.REGISTER, EntityType.AUTH, result.user.id,
        `User "${result.user.full_name}" registered`,
        { email: result.user.email }
      );

      const customDomain = await autoJoinFromCustomDomain(req, result.user.id).catch(() => null);

      res.status(201).json({
        data: { ...buildAuthResponse(result), customDomain },
        status: 201,
        message: "Registration successful.",
      });
    }
  }
);

export const firebaseLogin = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ status: 400, message: "Firebase ID token is required" });
      return;
    }

    const result = await authService.firebaseLogin(idToken);

    if (result.requires2FA) {
      res.status(200).json({
        data: { requires2FA: true, email: result.user.email },
        status: 200,
        message: 'A verification code has been sent to your email.',
      });
      return;
    }

    setTokenHeaders(res, result.tokens);

    logActivity(
      result.user.id, ActivityAction.LOGIN, EntityType.AUTH, result.user.id,
      `User "${result.user.full_name || result.user.email}" logged in`,
      { email: result.user.email, method: 'firebase' }
    );

    const customDomain = await autoJoinFromCustomDomain(req, result.user.id).catch(() => null);

    res.status(200).json({
      data: { ...buildAuthResponse(result), customDomain },
      status: 200,
      message: "Login successful",
    });
  }
);

export const login = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({
        status: 400,
        message: "Email and password are required",
      });
      return;
    }

    const result = await authService.login(email, password);

    if (result.requires2FA) {
      res.status(200).json({
        data: { requires2FA: true, email: result.user.email },
        status: 200,
        message: 'A verification code has been sent to your email.',
      });
      return;
    }

    setTokenHeaders(res, result.tokens);

    logActivity(
      result.user.id, ActivityAction.LOGIN, EntityType.AUTH, result.user.id,
      `User "${result.user.full_name || result.user.email}" logged in`,
      { email: result.user.email, method: 'email' }
    );

    const customDomain = await autoJoinFromCustomDomain(req, result.user.id).catch(() => null);

    res.status(200).json({
      data: { ...buildAuthResponse(result), customDomain },
      status: 200,
      message: "Login successful",
    });
  }
);

export const verifyTwoFactor = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ status: 400, message: 'Email and code are required.' });
      return;
    }
    const result = await authService.verifyTwoFactorCode(email, code);
    setTokenHeaders(res, result.tokens);
    logActivity(
      result.user.id, ActivityAction.LOGIN, EntityType.AUTH, result.user.id,
      `User "${result.user.full_name || result.user.email}" verified 2FA`,
      { email: result.user.email, method: '2fa' }
    );
    const customDomain = await autoJoinFromCustomDomain(req, result.user.id).catch(() => null);
    res.status(200).json({
      data: { ...buildAuthResponse(result), customDomain },
      status: 200,
      message: '2FA verification successful',
    });
  }
);

export const resendTwoFactor = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ status: 400, message: 'Email is required.' });
      return;
    }
    await authService.resendTwoFactorCode(email);
    res.status(200).json({ status: 200, message: 'A new code has been sent if applicable.' });
  }
);

export const googleSignIn = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({
        status: 400,
        message: "Google ID token is required",
      });
      return;
    }

    const result = await authService.googleSignIn(idToken);
    setTokenHeaders(res, result.tokens);

    logActivity(
      result.user.id,
      result.isNewUser ? ActivityAction.REGISTER : ActivityAction.LOGIN,
      EntityType.AUTH, result.user.id,
      `User "${result.user.full_name || result.user.email}" ${result.isNewUser ? 'registered' : 'logged in'} via Google`,
      { email: result.user.email, method: 'google' }
    );

    const customDomain = await autoJoinFromCustomDomain(req, result.user.id).catch(() => null);

    res.status(200).json({
      data: { ...buildAuthResponse(result), isNewUser: result.isNewUser, customDomain },
      status: 200,
      message: result.isNewUser
        ? "Account created via Google"
        : "Google sign-in successful",
    });
  }
);

/**
 * GET /api/auth/google/start
 *
 * Server-side OAuth code flow. The frontend redirects the browser here with
 * a `?return_to=<url>` query — typically the URL of the page on the
 * (possibly custom) domain that the user came from. We sign that URL into
 * the OAuth `state` parameter, then redirect to Google. After consent Google
 * redirects to `/api/auth/google/callback` (the only redirect URI that
 * needs to be registered in Google Console).
 */
export const googleAuthStart = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const returnTo = String(req.query.return_to || "");
    if (!/^https?:\/\//i.test(returnTo)) {
      res.status(400).send("Invalid return_to");
      return;
    }
    const state = signGoogleState(returnTo);
    const url = googleAuthService.buildAuthUrl(state);
    res.redirect(url);
  }
);

/**
 * GET /api/auth/google/callback
 *
 * Google redirects here after the user signs in. We exchange the code for a
 * profile, complete the sign-in, then redirect the user back to the frontend
 * URL captured in `state`, passing the access/refresh tokens via the URL
 * fragment (so they're never sent to any server).
 */
export const googleAuthCallback = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    const error = req.query.error ? String(req.query.error) : "";

    const verified = verifyGoogleState(state);
    if (!verified) {
      res.status(400).send("Invalid or expired OAuth state");
      return;
    }
    const { returnTo } = verified;

    if (error || !code) {
      const sep = returnTo.includes("#") ? "&" : "#";
      res.redirect(`${returnTo}${sep}google_error=${encodeURIComponent(error || "no_code")}`);
      return;
    }

    try {
      const profile = await googleAuthService.exchangeCodeForProfile(code);
      const result = await authService.signInWithGoogleProfile(profile);

      logActivity(
        result.user.id,
        result.isNewUser ? ActivityAction.REGISTER : ActivityAction.LOGIN,
        EntityType.AUTH,
        result.user.id,
        `User "${result.user.full_name || result.user.email}" ${result.isNewUser ? "registered" : "logged in"} via Google (custom domain)`,
        { email: result.user.email, method: "google_code_flow" }
      );

      // Auto-join custom-domain branch if applicable.
      // The request here comes from Google's redirect (Host: api server), so we
      // inject the custom domain from returnTo so the service can resolve it.
      try {
        const returnUrl = new URL(returnTo);
        (req.headers as Record<string, string>)['x-custom-domain'] = returnUrl.hostname;
      } catch { /* invalid URL — no-op */ }
      await autoJoinFromCustomDomain(req, result.user.id).catch(() => null);

      // Pass tokens via URL fragment (`#`) — never sent to servers.
      const fragment = new URLSearchParams({
        access_token: result.tokens.accessToken,
        refresh_token: result.tokens.refreshToken,
        is_new: result.isNewUser ? "1" : "0",
      }).toString();
      res.redirect(`${returnTo}#${fragment}`);
    } catch (err: any) {
      const msg = encodeURIComponent(err?.message || "google_auth_failed");
      const sep = returnTo.includes("#") ? "&" : "#";
      res.redirect(`${returnTo}${sep}google_error=${msg}`);
    }
  }
);

export const refreshToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const token = req.body?.refreshToken;
    if (!token) {
      res.status(400).json({
        status: 400,
        message: "Refresh token is required",
      });
      return;
    }

    const result = await authService.refreshTokens(token);
    setTokenHeaders(res, result.tokens);

    res.status(200).json({
      data: buildAuthResponse(result),
      status: 200,
      message: "Token refreshed",
    });
  }
);

export const logout = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Try to identify the user from the Authorization header so we can
    // revoke their refresh token. This is best-effort — even if the token
    // is expired or missing we still proceed.
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
      if (token) {
        const { TokenService } = await import('../services/auth/token.service');
        const ts = new TokenService();
        const decoded = ts.verifyAccessToken(token);
        if (decoded?.id) {
          await authService.revokeRefreshToken(decoded.id);
          await logActivity(
            decoded.id,
            ActivityAction.LOGOUT,
            EntityType.AUTH,
            decoded.id,
            `User "${decoded.email || decoded.id}" logged out`,
            { email: decoded.email }
          );
        }
      }
    } catch {
      // Token expired or invalid — still proceed with logout
    }
    res.status(200).json({ status: 200, message: "Logged out successfully" });
  }
);

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ status: 400, message: "Email is required" });
      return;
    }

    const result = await authService.initiatePasswordReset(email);

    res.status(200).json({
      data: { otpSent: result.otpSent },
      status: 200,
      message: result.otpSent
        ? "If the email exists, an OTP has been sent"
        : "OTP generated but email could not be sent.",
    });
  }
);

export const verifyResetOtp = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res
        .status(400)
        .json({ status: 400, message: "Email and OTP are required" });
      return;
    }

    const { isValid } = await authService.verifyPasswordResetOtp(email, otp);

    res.status(200).json({
      data: { isValid },
      status: 200,
      message: isValid ? "OTP is valid" : "OTP is invalid",
    });
  }
);

export const setNewPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      res.status(400).json({
        status: 400,
        message: "Email and new password are required",
      });
      return;
    }

    const result = await authService.setNewPassword(email, newPassword);
    res.status(200).json({
      data: result,
      status: 200,
      message: "Password has been reset successfully",
    });
  }
);

export const changePassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user?.id || req.body.userId;
    const { oldPassword, newPassword } = req.body;

    if (!userId || !oldPassword || !newPassword) {
      res.status(400).json({
        status: 400,
        message: "userId, oldPassword, and newPassword are required",
      });
      return;
    }

    const result = await authService.changePassword(
      userId,
      oldPassword,
      newPassword
    );
    res.status(200).json({
      data: result,
      status: 200,
      message: "Password changed successfully",
    });
  }
);
