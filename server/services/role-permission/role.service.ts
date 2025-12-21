import { Repository } from "typeorm";
import { Role } from "../../models/role-permission/role.model";
import { Permission } from "../../models/role-permission/permission.model";
import { AppDataSource } from "../../config/database";
import { UserRole } from "../../types/user";

export class RoleService {
  private roleRepository: Repository<Role>;
  private permissionRepository: Repository<Permission>;

  constructor() {
    this.roleRepository = AppDataSource.getRepository(Role);
    this.permissionRepository = AppDataSource.getRepository(Permission);
  }

  async createRole(
  name: UserRole,
  permissionIds: string[]
): Promise<Role> {

  const existingRole = await this.roleRepository.findOne({
    where: {
      name,
    }
  });
  
  if (existingRole) {
    throw new Error(`Role with name "${name}" already exists`);
  }

  const permissions = await this.permissionRepository.findByIds(permissionIds);
  if (permissions.length !== permissionIds.length) {
    throw new Error("Some permissions not found");
  }

  const role = this.roleRepository.create({
    name,
    permissions,
  });

  return await this.roleRepository.save(role);
}

  async updateRole(
  roleId: string,
  updates: {
    name?: UserRole;
    permissionIds?: string[];
  }
): Promise<Role> {
  const role = await this.roleRepository.findOne({
    where: { id: roleId },
    relations: ["permissions"],
  });

  if (!role) {
    throw new Error("Role not found");
  }

  if (updates.name && updates.name !== role.name) {
    const existingRole = await this.roleRepository.findOne({
      where: {
        name: updates.name,
      }
    });
    
    if (existingRole) {
      throw new Error(`Role with name "${updates.name}" already exists`);
    }
    
    role.name = updates.name;
  }

  if (updates.permissionIds) {
    const permissions = await this.permissionRepository.findByIds(updates.permissionIds);
    role.permissions = permissions;
  }

  return await this.roleRepository.save(role);
}

 async getRoles(): Promise<Role[]> {
    return await this.roleRepository.find({
      relations: ["permissions"],
      order: { name: "ASC" },
    });
  }

  async getRoleDetails(roleId: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ["permissions"],
    });

    if (!role) {
      throw new Error("Role not found");
    }

    return role;
  }

  async deleteRole(roleId: string): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ["users"],
    });

    if (!role) {
      throw new Error("Role not found");
    }

    // Check if role is assigned to any users
    if (role.users && role.users.length > 0) {
      throw new Error(`Cannot delete role: assigned to ${role.users.length} user(s)`);
    }

    await this.roleRepository.remove(role);
  }

}