import { Request, Response } from "express";
import { RoleService } from "../../services/role-permission/role.service";
import asyncHandler from "../../utils/asyncHandler";

export class RoleController {
  private roleService: RoleService;

  constructor() {
    this.roleService = new RoleService();
  }

  createRole = asyncHandler(async (req: Request, res: Response) => {
    const { name, permissionIds } = req.body;
    // const userId = (req as any).user?.id;

    if (!name || !permissionIds || !Array.isArray(permissionIds)) {
      res.status(400).json({
        status: 400,
        message: "Name and permissionIds are required",
        data: null,
      });
      return;
    }

    try {
      const role = await this.roleService.createRole(
        name,
        permissionIds
      );
      res.status(201).json({
        status: 201,
        message: "Role created successfully",
        data: role,
      });
    } catch (error: any) {
      res.status(400).json({
        status: 400,
        message: error.message,
        data: null,
      });
    }
  });

  updateRole = asyncHandler(async (req: Request, res: Response) => {
    const roleId = req.params.roleId;
    const updates = req.body;

    try {
      const role = await this.roleService.updateRole(roleId, updates);
      res.status(200).json({
        status: 200,
        message: "Role updated successfully",
        data: role,
      });
    } catch (error: any) {
      res.status(400).json({
        status: 400,
        message: error.message,
        data: null,
      });
    }
  });

  getCommunityRoles = asyncHandler(async (req: Request, res: Response) => {

    try {
      const roles = await this.roleService.getRoles();
      res.status(200).json({
        status: 200,
        message: "Roles retrieved successfully",
        data: roles,
      });
    } catch (error: any) {
      res.status(400).json({
        status: 400,
        message: error.message,
        data: null,
      });
    }
  });

  getRoleDetails = asyncHandler(async (req: Request, res: Response) => {
    const roleId = req.params.roleId;

    try {
      const role = await this.roleService.getRoleDetails(roleId);
      res.status(200).json({
        status: 200,
        message: "Role details retrieved successfully",
        data: role,
      });
    } catch (error: any) {
      res.status(400).json({
        status: 400,
        message: error.message,
        data: null,
      });
    }
  });

  deleteRole = asyncHandler(async (req: Request, res: Response) => {
    const roleId = req.params.roleId;

    try {
      await this.roleService.deleteRole(roleId);
      res.status(200).json({
        status: 200,
        message: "Role deleted successfully",
        data: null,
      });
    } catch (error: any) {
      res.status(400).json({
        status: 400,
        message: error.message,
        data: null,
      });
    }
  });

}