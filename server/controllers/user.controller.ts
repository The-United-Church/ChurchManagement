import { Request, Response, RequestHandler } from "express";
import { classToPlain } from "class-transformer";
import { UserService } from "../services/user.service";
import asyncHandler from "../utils/asyncHandler";
import { AuthRequest } from "../middleware/auth.middleware";
import { logActivity } from "../utils/activityLogger";
import { ActivityAction, EntityType } from "../models/activity-log.model";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  createUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { first_name, last_name, email, role, phone_number, username } = req.body;
      if (!first_name || !last_name || !email || !role) {
        res.status(400).json({
          status: 400,
          message: "first_name, last_name, email, and role are required",
        });
        return;
      }
      try {
        const user = await this.userService.createUserWithGeneratedPassword(
          email,
          role,
          first_name,
          last_name,
          phone_number,
          username
        );
        if (user) {
          const userId = (req as any).user?.id;
          await logActivity(
            userId,
            ActivityAction.CREATE,
            EntityType.USER,
            user.id,
            `User "${user.full_name || user.email}" created`,
            { userName: user.full_name, userEmail: user.email, role: user.role?.name }
          );
        }
        res.status(201).json({
          data: classToPlain(user),
          status: 201,
          message: "User created successfully. Password email sent (check server logs if email delivery failed).",
        });
      } catch (error: any) {
        res.status(500).json({
          status: 500,
          message: error.message || "Failed to create user",
        });
      }
    }
  );

  createManyUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const users = req.body;
      if (!Array.isArray(users) || users.length === 0) {
        res.status(400).json({
          data: null,
          status: 400,
          message: "Users array is required",
        });
        return;
      }
      const result = await this.userService.createManyUsers(users);
      res.status(201).json({
        data: result.created,
        status: 201,
        message: `Users created: ${result.uniqueCount}, duplicates skipped: ${result.duplicateCount}`,
        uniqueCount: result.uniqueCount,
        duplicateCount: result.duplicateCount,
        duplicateData: result.duplicates,
      });
    }
  );

  getUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { role } = req.query;
      
      let users;
      if (role && typeof role === 'string') {
        users = await this.userService.getUsersByRole(role);
      } else {
        users = await this.userService.getAllUsers();
      }
      
      res.status(200).json({
        data: users.map((u) => classToPlain(u)),
        status: 200,
        message: "Users fetched successfully",
      });
    }
  );

  getUserProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { user } = req as AuthRequest;
      const userId = user?.id;
      const profile = await this.userService.getUserById(userId);
      if (!profile) {
        res.status(404).json({
          data: null,
          status: 404,
          message: "Profile not found",
        });
        return;
      }

      const rolePermissions = profile.role?.permissions || [];
      const groupPermissions = (profile.groups || []).flatMap((group: any) => group.permissions || []);
      const individualPermissions = profile.permissions || [];

      const effectivePermissions = [
        ...rolePermissions.map((p: any) => p.name || p.id),
        ...groupPermissions.map((p: any) => p.name || p.id),
        ...individualPermissions.map((p: any) => p.name || p.id),
      ];

      // Manually construct response to ensure effectivePermissions is included
      const profileWithEffectivePermissions = {
        ...profile,
        effectivePermissions,
      };

      res.status(200).json({
        data: classToPlain(profileWithEffectivePermissions),
        status: 200,
        message: "Profile fetched successfully",
      });
    }
  );

  getUserById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      if (!user) {
        res.status(404).json({
          data: null,
          status: 404,
          message: "User not found",
        });
        return;
      }
      res.status(200).json({
        data: classToPlain(user),
        status: 200,
        message: "User fetched successfully",
      });
    }
  );

  updateProfile: RequestHandler = asyncHandler(async (req, res) => {
    const { user } = req as AuthRequest;
    const userId = user?.id;
    const updated = await this.userService.updateBasicProfile(
      userId!,
      req.body
    );
    if (!updated) {
      res.status(404).json({
        data: null,
        status: 404,
        message: "User not found",
      });
      return;
    }
    const userProfile = await this.userService.getUserById(userId!);
    res.status(200).json({
      data: userProfile,
      status: 200,
      message: "Profile updated",
    });
  });

  updateUserInfo = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { full_name, role, is_active, departmentId, groupIds, permissionIds } = req.body;
      const userService = new UserService();
      try {
      const updatedUser = await userService.updateUserInfo(
        id,
        {
          full_name,
          role,
          is_active,
            departmentId,
            groupIds,
            permissionIds
        }
      );
      if (!updatedUser) {
        res.status(404).json({
          data: null,
          status: 404,
          message: "User not found",
        });
        return;
      }
      const userId = (req as any).user?.id;
      const existingUser = await userService.getUserById(id);
      
      const oldStatus = existingUser?.is_active;
      const newStatus = updatedUser.is_active;
      const oldRole = existingUser?.role?.name;
      const newRole = updatedUser.role?.name;
      
      if (oldStatus !== undefined && oldStatus !== newStatus) {
        await logActivity(
          userId,
          ActivityAction.STATUS_CHANGE,
          EntityType.USER,
          id,
          `User "${updatedUser.full_name || updatedUser.email}" status changed (${oldStatus ? 'active' : 'inactive'} → ${newStatus ? 'active' : 'inactive'})`,
          { userName: updatedUser.full_name, userEmail: updatedUser.email, oldStatus, newStatus }
        );
      }
      
      if (oldRole && oldRole !== newRole) {
        await logActivity(
          userId,
          ActivityAction.STATUS_CHANGE,
          EntityType.USER,
          id,
          `User "${updatedUser.full_name || updatedUser.email}" role changed (${oldRole} → ${newRole})`,
          { userName: updatedUser.full_name, userEmail: updatedUser.email, oldRole, newRole }
        );
      }
      
      if ((oldStatus === undefined || oldStatus === newStatus) && (!oldRole || oldRole === newRole)) {
        await logActivity(
          userId,
          ActivityAction.UPDATE,
          EntityType.USER,
          id,
          `User "${updatedUser.full_name || updatedUser.email}" updated`,
          { userName: updatedUser.full_name, userEmail: updatedUser.email }
        );
      }
      
      res.status(200).json({
        data: updatedUser,
        status: 200,
        message: "User updated successfully",
      });
      } catch (error: any) {
        console.error('Error updating user:', error);
        res.status(500).json({
          data: null,
          status: 500,
          message: error.message || "Failed to update user",
        });
      }
    }
  );

  updateSettings = asyncHandler(async (req, res) => {
    const { user } = req as any;
    const { settings } = req.body;

    if (!settings || typeof settings !== "object") {
      res.status(400).json({
        status: 400,
        message: "The 'settings' object is required in the request body.",
      });
    }

    const updatedUser = await this.userService.updateSettings(
      user.id,
      settings
    );

    if (!updatedUser) {
      res.status(404).json({
        status: 404,
        message: "User not found.",
      });
    }

    res.status(200).json({
      data: updatedUser?.settings,
      status: 200,
      message: "Settings updated successfully.",
    });
  });

  deleteUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const deletedUser = await this.userService.deleteUser(id);
      
      if (!deletedUser) {
        res.status(404).json({
          data: null,
          status: 404,
          message: "User not found",
        });
        return;
      }

      const userId = (req as any).user?.id;
      await logActivity(
        userId,
        ActivityAction.DELETE,
        EntityType.USER,
        id,
        `User "${deletedUser.full_name || deletedUser.email || id}" deleted/deactivated`,
        { userName: deletedUser.full_name, userEmail: deletedUser.email }
      );
      
      res.status(200).json({
        data: classToPlain(deletedUser),
        status: 200,
        message: "User deactivated successfully",
      });
    }
  );

  getUsersWithFilters = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { search, role, status } = req.query;

      const users = await this.userService.getUsersWithFilters({
        search: search as string,
        role: role as string,
        status: status as string,
      });

      res.status(200).json({
        data: users.map((u) => classToPlain(u)),
        status: 200,
        message: "Users fetched successfully",
      });
    }
  );

  getUserStatistics = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const stats = await this.userService.getUserStatistics();

      res.status(200).json({
        data: stats,
        status: 200,
        message: "User statistics fetched successfully",
      });
    }
  );

  getAllPermissions = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const permissions = await this.userService.getAllPermissions();

      res.status(200).json({
        data: permissions,
        status: 200,
        message: "Permissions fetched successfully",
      });
    }
  );

  getUserPermissions = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { userId } = req.params;

      const permissions = await this.userService.getUserPermissions(userId);

      res.status(200).json({
        data: permissions,
        status: 200,
        message: "User permissions fetched successfully",
      });
    }
  );

  updateUserStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { is_active } = req.body;

      if (typeof is_active !== "boolean") {
        res.status(400).json({
          data: null,
          status: 400,
          message: "is_active must be a boolean",
        });
        return;
      }

      const updatedUser = await this.userService.updateUserStatus(id, is_active);

      if (!updatedUser) {
        res.status(404).json({
          data: null,
          status: 404,
          message: "User not found",
        });
        return;
      }

      const userId = (req as any).user?.id;
      await logActivity(
        userId,
        ActivityAction.STATUS_CHANGE,
        EntityType.USER,
        id,
        `User "${updatedUser.full_name || updatedUser.email}" status changed to ${is_active ? "active" : "inactive"}`,
        { userName: updatedUser.full_name, userEmail: updatedUser.email, isActive: is_active }
      );

      res.status(200).json({
        data: classToPlain(updatedUser),
        status: 200,
        message: "User status updated successfully",
      });
    }
  );

  updateUserRole = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || typeof role !== "string") {
        res.status(400).json({
          data: null,
          status: 400,
          message: "role is required and must be a string",
        });
        return;
      }

      const updatedUser = await this.userService.updateUserRole(id, role);

      if (!updatedUser) {
        res.status(404).json({
          data: null,
          status: 404,
          message: "User not found",
        });
        return;
      }

      const userId = (req as any).user?.id;
      await logActivity(
        userId,
        ActivityAction.STATUS_CHANGE,
        EntityType.USER,
        id,
        `User "${updatedUser.full_name || updatedUser.email}" role changed to ${role}`,
        { userName: updatedUser.full_name, userEmail: updatedUser.email, role }
      );

      res.status(200).json({
        data: classToPlain(updatedUser),
        status: 200,
        message: "User role updated successfully",
      });
    }
  );

  updateUserPermissions = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { permissionIds } = req.body;

      if (!Array.isArray(permissionIds)) {
        res.status(400).json({
          data: null,
          status: 400,
          message: "permissionIds must be an array",
        });
        return;
      }

      const updatedUser = await this.userService.updateUserPermissions(
        id,
        permissionIds
      );

      if (!updatedUser) {
        res.status(404).json({
          data: null,
          status: 404,
          message: "User not found",
        });
        return;
      }

      const userId = (req as any).user?.id;
      await logActivity(
        userId,
        ActivityAction.UPDATE,
        EntityType.USER,
        id,
        `User "${updatedUser.full_name || updatedUser.email}" permissions updated`,
        { userName: updatedUser.full_name, userEmail: updatedUser.email, permissionCount: permissionIds.length }
      );

      res.status(200).json({
        data: classToPlain(updatedUser),
        status: 200,
        message: "User permissions updated successfully",
      });
    }
  );
}
