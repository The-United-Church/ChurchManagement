import { Repository } from "typeorm";
import { Permission } from "../../models/role-permission/permission.model";
import { AppDataSource } from "../../config/database";

export class PermissionService {
  private permissionRepository: Repository<Permission>;

  constructor() {
    this.permissionRepository = AppDataSource.getRepository(Permission);
  }

  /**
   * Create a new permission
   */
  async createPermission(
    name: string,
    category: string
  ): Promise<Permission> {
    // if (!/^[a-z_]+$/.test(name)) {
    //   throw new Error("Permission name must be lowercase with underscores");
    // }

    const existingPermission = await this.permissionRepository.findOneBy({ name });
    if (existingPermission) {
      throw new Error("Permission with this name already exists");
    }

    const permission = this.permissionRepository.create({
      name,
      category
    });

    return await this.permissionRepository.save(permission);
  }

  /**
   * Update an existing permission
   */
  async updatePermission(
    permissionId: string,
  ): Promise<Permission> {
    const permission = await this.permissionRepository.findOneBy({ id: permissionId });
    if (!permission) {
      throw new Error("Permission not found");
    }

    return await this.permissionRepository.save(permission);
  }

  /**
   * Get all permissions, optionally filtered by category
   */
  async getAllPermissions(): Promise<Permission[]> {
    const options: any = {
      order: { name: "ASC" }
    };

    return await this.permissionRepository.find(options);
  }

  /**
   * Get permission details by ID
   */
  async getPermissionById(permissionId: string): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { id: permissionId },
      // relations: ["roles"]
    });

    if (!permission) {
      throw new Error("Permission not found");
    }

    return permission;
  }

  /**
   * Get permission details by name
   */
  async getPermissionByName(name: string): Promise<Permission> {
    const permission = await this.permissionRepository.findOneBy({ name });

    if (!permission) {
      throw new Error("Permission not found");
    }

    return permission;
  }
}