import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import asyncHandler from "../utils/asyncHandler";
import { AuthRequest } from "../middleware/auth.middleware";
import { AppDataSource } from "../config/database";
import { User } from "../models/user.model";

const authService = new AuthService();

export const register = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userRepository = AppDataSource.getRepository(User);
    const userCount = await userRepository.count();
    
    if (userCount > 0) {
      res.status(403).json({
        error: "Public registration is disabled. Please contact your administrator to create an account for you.",
        status: 403,
        message: "Public registration is disabled. Please contact your administrator to create an account for you.",
      });
      return;
    }

    const { email, full_name, password } = req.body;

    if (!email || !full_name || !password) {
      res.status(400).json({
        error: "All fields are required: email, full_name, password",
        status: 400,
      });
      return;
    }

    const result = await authService.register(email, full_name, password);

    const rolePermissions = result.user.role?.permissions || [];
    const groupPermissions = (result.user.groups || []).flatMap((group: any) => group.permissions || []);
    const individualPermissions = result.user.permissions || [];

    res.status(201).json({
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          full_name: result.user.full_name,
        },
        token: result.token,
        role: result.user.role,
        groups: result.user.groups || [],
        permissions: individualPermissions,
        effectivePermissions: [
          ...rolePermissions.map((p: any) => p.name || p.id),
          ...groupPermissions.map((p: any) => p.name || p.id),
          ...individualPermissions.map((p: any) => p.name || p.id),
        ]
      },
      status: 201,
      message: "Admin account created successfully. You can now create other users from User Management.",
    });
  }
);

export const login = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    console.log("email, password", email, password);
    const result = await authService.login(email, password);

    const rolePermissions = result.user.role?.permissions || [];
    const groupPermissions = (result.user.groups || []).flatMap((group: any) => group.permissions || []);
    const individualPermissions = result.user.permissions || [];

    res.status(200).json({
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          full_name: result.user.full_name,
        },
        token: result.token,
        role: result.user.role,
        groups: result.user.groups || [],
        permissions: individualPermissions,
        effectivePermissions: [
          ...rolePermissions.map((p: any) => p.name || p.id),
          ...groupPermissions.map((p: any) => p.name || p.id),
          ...individualPermissions.map((p: any) => p.name || p.id),
        ]
      },
      status: 200,
      message: "Login successful",
    });
  }
);

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        error: "Email is required",
        status: 400,
      });
      return;
    }

    const result = await authService.initiatePasswordReset(email);

    res.status(200).json({
      data: {
        otpSent: result.otpSent,
      },
      status: 200,
      message: result.otpSent 
        ? "If the email exists, an OTP has been sent" 
        : "OTP generated but email could not be sent. Check server logs for OTP code or contact administrator.",
    });
  }
);

export const verifyResetOtp = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({
        error: "Email and OTP are required",
        status: 400,
      });
      return;
    }

    const { isValid } = await authService.verifyPasswordResetOtp(email, otp);

    res.status(200).json({
      data: {
        isValid,
      },
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
        error: "Email and new password are required",
        status: 400,
      });
      return;
    }
    try {
      const result = await authService.setNewPassword(email, newPassword);
      res.status(200).json({
        data: result,
        status: 200,
        message: "Password has been reset successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        error: error.message || "Failed to reset password",
        status: 400,
      });
    }
  }
);

export const changePassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user?.id || req.body.userId;
    const { oldPassword, newPassword } = req.body;
    if (!userId || !oldPassword || !newPassword) {
      res.status(400).json({
        error: "userId, oldPassword, and newPassword are required",
        status: 400,
      });
      return;
    }
    try {
      const result = await authService.changePassword(userId, oldPassword, newPassword);
      res.status(200).json({
        data: result,
        status: 200,
        message: "Password changed successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        error: error.message || "Failed to change password",
        status: 400,
      });
    }
  }
);
