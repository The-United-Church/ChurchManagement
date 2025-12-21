import { Request, Response } from "express";
import { PermissionService } from "../../services/role-permission/permission.service";
import asyncHandler from "../../utils/asyncHandler";

export class PermissionController {
  private permissionService: PermissionService;

  constructor() {
    this.permissionService = new PermissionService();
  }

  createPermission = asyncHandler(async (req: Request, res: Response) => {
    const { name, category } = req.body;

    if (!name) {
      res.status(400).json({
        status: 400,
        message: "Name is required",
        data: null,
      });
      return;
    }

    try {
      const permission = await this.permissionService.createPermission(
        name, category
      );
      res.status(201).json({
        status: 201,
        message: "Permission created successfully",
        data: permission,
      });
    } catch (error: any) {
      res.status(400).json({
        status: 400,
        message: error.message,
        data: null,
      });
    }
  });


  updatePermission = asyncHandler(async (req: Request, res: Response) => {
    const permissionId = req.params.permissionId;

    try {
      const permission = await this.permissionService.updatePermission(permissionId);
      res.status(200).json({
        status: 200,
        message: "Permission updated successfully",
        data: permission,
      });
    } catch (error: any) {
      res.status(400).json({
        status: 400,
        message: error.message,
        data: null,
      });
    }
  });

  
  getAllPermissions = asyncHandler(async (req: Request, res: Response) => {

    try {
      const permissions = await this.permissionService.getAllPermissions();
      res.status(200).json({
        status: 200,
        message: "Permissions retrieved successfully",
        data: permissions,
      });
    } catch (error: any) {
      res.status(400).json({
        status: 400,
        message: error.message,
        data: null,
      });
    }
  });

  
  getPermissionById = asyncHandler(async (req: Request, res: Response) => {
    const permissionId = req.params.permissionId;

    try {
      const permission = await this.permissionService.getPermissionById(permissionId);
      res.status(200).json({
        status: 200,
        message: "Permission retrieved successfully",
        data: permission,
      });
    } catch (error: any) {
      res.status(400).json({
        status: 400,
        message: error.message,
        data: null,
      });
    }
  });

  
  getPermissionByName = asyncHandler(async (req: Request, res: Response) => {
    const permissionName = req.params.permissionName;

    try {
      const permission = await this.permissionService.getPermissionByName(permissionName);
      res.status(200).json({
        status: 200,
        message: "Permission retrieved successfully",
        data: permission,
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