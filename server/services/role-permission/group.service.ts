import { AppDataSource } from "../../config/database";
import { Group } from "../../models/role-permission/group.model";
import { Permission } from "../../models/role-permission/permission.model";
import { In } from "typeorm";

export class GroupService {
  private readonly groupRepository = AppDataSource.getRepository(Group);
  private readonly permissionRepository = AppDataSource.getRepository(Permission);

  async getAllGroups(): Promise<Group[]> {
    return this.groupRepository.find({
      relations: ["permissions", "users"],
      order: { createdAt: "DESC" },
    });
  }

  async getGroupById(id: string): Promise<Group | null> {
    return this.groupRepository.findOne({
      where: { id },
      relations: ["permissions", "users"],
    });
  }

  async createGroup(data: { name: string; description?: string; permissionIds: string[] }): Promise<Group> {
    // Check if group with same name exists
    const existing = await this.groupRepository.findOne({ where: { name: data.name } });
    if (existing) {
      throw new Error("Group with this name already exists");
    }

    // Find permissions by IDs
    const permissions = data.permissionIds && data.permissionIds.length > 0
      ? await this.permissionRepository.findBy({ id: In(data.permissionIds) })
      : [];

    const group = this.groupRepository.create({
      name: data.name,
      description: data.description,
      permissions,
    });

    return this.groupRepository.save(group);
  }

  async updateGroup(
    id: string,
    data: { name?: string; description?: string; permissionIds?: string[] }
  ): Promise<Group | null> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ["permissions"],
    });

    if (!group) {
      return null;
    }

    // Check name uniqueness if changing name
    if (data.name && data.name !== group.name) {
      const existing = await this.groupRepository.findOne({ where: { name: data.name } });
      if (existing) {
        throw new Error("Group with this name already exists");
      }
      group.name = data.name;
    }

    if (data.description !== undefined) {
      group.description = data.description;
    }

    // Update permissions if provided
    if (data.permissionIds !== undefined) {
      const permissions = data.permissionIds.length > 0
        ? await this.permissionRepository.findBy({ id: In(data.permissionIds) })
        : [];
      group.permissions = permissions;
    }

    return this.groupRepository.save(group);
  }

  async deleteGroup(id: string): Promise<{ success: boolean; userCount?: number; userNames?: string[] }> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ["users"],
    });

    if (!group) {
      return { success: false };
    }

    // Check if group has users assigned
    if (group.users && group.users.length > 0) {
      const userNames = group.users.map((user: any) => user.full_name || user.email || 'Unknown User');
      return {
        success: false,
        userCount: group.users.length,
        userNames
      };
    }

    await this.groupRepository.remove(group);
    return { success: true };
  }
}

