import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import asyncHandler from "../utils/asyncHandler";
import { AuthRequest } from "../middleware/auth.middleware";
import { getPermissionsForRole } from "../utils/roles";
import { logActivity } from "../utils/activityLogger";
import { ActivityAction, EntityType } from "../models/activity-log.model";

const authService = new AuthService();

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
    role: { name: roleName },
    permissions,
  };
}

export const register = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { idToken, full_name, denomination_name, description, location, state, country, address } = req.body;
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
      });

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
          role: { name: roleName },
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

      res.status(201).json({
        data: buildAuthResponse(result),
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
    setTokenHeaders(res, result.tokens);

    logActivity(
      result.user.id, ActivityAction.LOGIN, EntityType.AUTH, result.user.id,
      `User "${result.user.full_name || result.user.email}" logged in`,
      { email: result.user.email, method: 'firebase' }
    );

    res.status(200).json({
      data: buildAuthResponse(result),
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
    setTokenHeaders(res, result.tokens);

    logActivity(
      result.user.id, ActivityAction.LOGIN, EntityType.AUTH, result.user.id,
      `User "${result.user.full_name || result.user.email}" logged in`,
      { email: result.user.email, method: 'email' }
    );

    res.status(200).json({
      data: buildAuthResponse(result),
      status: 200,
      message: "Login successful",
    });
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

    res.status(200).json({
      data: { ...buildAuthResponse(result), isNewUser: result.isNewUser },
      status: 200,
      message: result.isNewUser
        ? "Account created via Google"
        : "Google sign-in successful",
    });
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
        const { TokenService } = await import('../services/token.service');
        const ts = new TokenService();
        const decoded = ts.verifyAccessToken(token);
        if (decoded?.id) {
          await authService.revokeRefreshToken(decoded.id);
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
