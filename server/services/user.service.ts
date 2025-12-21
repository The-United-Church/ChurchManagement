import { classToPlain } from "class-transformer";
import { AppDataSource } from "../config/database";
import { User } from "../models/user.model";
import { UserSettings } from "../types/user";
import { Role } from "../models/role-permission/role.model";
import emailService from "../email/email.service";
import { Department } from "../models/catalogs/department.model";
import { Permission } from "../models/role-permission/permission.model";
import { In } from "typeorm";

export class UserService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly departmentRepository = AppDataSource.getRepository(Department);
  private readonly permissionRepository = AppDataSource.getRepository(Permission);

  async createUserWithGeneratedPassword(
    email: string,
    roleName: string,
    first_name?: string,
    last_name?: string,
    phone_number?: string,
    username?: string
  ): Promise<User | null> {
    // Check for existing email
    const exists = await this.userRepository.findOne({ where: { email } });
    if (exists) throw new Error('User with this email already exists');

    // Generate a random password
    const generatedPassword = Math.random().toString(36).slice(-10);
    const bcrypt = require("bcrypt");
    const password_hash = await bcrypt.hash(generatedPassword, 10);

    // Find or create role
    const roleRepo = AppDataSource.getRepository(Role);
    let role = await roleRepo.findOne({ where: { name: roleName } });
    if (!role) {
      role = roleRepo.create({ name: roleName });
      await roleRepo.save(role);
    }

    // Create user
    const user = this.userRepository.create({
      first_name,
      last_name,
      email,
      password_hash,
      role,
      is_active: true,
      phone_number,
      username
    });
    const savedUser = await this.userRepository.save(user);

    try {
      await emailService.sendEmail(
        email,
        "Your Account Password",
        `Your password is: ${generatedPassword}`,
        undefined,
        // { retries: 2, throwOnError: false }
      );
    } catch (emailError: any) {
      console.error('⚠️  Failed to send password email, but user was created successfully');
      console.error('   User can use "Forgot Password" to reset their password');
      console.error('   Email error:', emailError.message);
    }

    return savedUser;
  }

  async createManyUsers(
    users: { first_name: string; last_name?: string; phone_number: string; email: string; roleName: string }[]
  ): Promise<{ created: User[]; duplicateCount: number; uniqueCount: number; duplicates: { first_name: string; last_name?: string; phone_number: string; email: string; roleName: string }[] }> {
    // Get all emails to check for duplicates
    const emails = users.map((u) => u.email.trim().toLowerCase());
    const existing = await this.userRepository
      .createQueryBuilder("user")
      .where("LOWER(user.email) IN (:...emails)", { emails })
      .getMany();
    const existingEmails = new Set(
      existing.map((u) => u.email.trim().toLowerCase())
    );
    const uniqueUsers = users.filter(
      (u) => !existingEmails.has(u.email.trim().toLowerCase())
    );
    const duplicateUsers = users.filter(
      (u) => existingEmails.has(u.email.trim().toLowerCase())
    );
    let created: User[] = [];
    if (uniqueUsers.length > 0) {
      for (const user of uniqueUsers) {
        const createdUser = await this.createUserWithGeneratedPassword(
          user.email,
          user.roleName,
          user.first_name,
          user.last_name,
          user.phone_number,
        );
        if (createdUser) created.push(createdUser);
      }
    }
    return {
      created,
      duplicateCount: duplicateUsers.length,
      uniqueCount: uniqueUsers.length,
      duplicates: duplicateUsers
    };
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      relations: ["role", "role.permissions", "groups", "groups.permissions", "permissions", "department"],
      order: { createdAt: "DESC" },
    });
  }

  async getUsersByRole(roleName: string): Promise<User[]> {
    return this.userRepository.find({
      where: { role: { name: roleName } },
      relations: ["role", "role.permissions", "groups", "groups.permissions", "permissions", "department"],
      order: { createdAt: "DESC" },
    });
  }

  async getUserById(id: string): Promise<any> {
    const user = await this.userRepository.findOne({ 
      where: { id },
      relations: ["role", "role.permissions", "groups", "groups.permissions", "permissions", "department"]
    });
    return user ? classToPlain(user) : null;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return null;
    }
    Object.assign(user, data);
    const savedUser = this.userRepository.save(user);

    const { password, ...userWithoutPassword } = classToPlain(savedUser) as any;
    return userWithoutPassword;
  }

  async updateBasicProfile(
    id: string,
    data: Partial<User>
  ): Promise<User | null> {
    const existingUser = await this.userRepository.findOne({ where: { id } });
    if (!existingUser) return null;

    const updatedUser = {
      ...existingUser,
      ...data,
    };

    const savedUser = await this.userRepository.upsert(updatedUser, ["id"]);

    const { password, ...userWithoutPassword } = classToPlain(savedUser) as any;
    return userWithoutPassword;
  }

  async updateSettings(
    userId: string,
    settings: UserSettings
  ): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return null;
    }

    user.settings = settings;
    const savedUser = this.userRepository.save(user);

    const { password, ...userWithoutPassword } = classToPlain(savedUser) as any;
    return userWithoutPassword;
  }

  async updateUserInfo(
    id: string,
    data: {
      full_name?: string;
      role?: string;
      is_active?: boolean;
      departmentId?: number;
      groupIds?: string[];
      permissionIds?: string[];
    }
  ): Promise<Omit<User, "password"> | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["role", "groups", "permissions"],
    });
    if (!user) return null;

    // first check if the department id exist
    if (data.departmentId !== undefined) {
    const department = await this.departmentRepository.findOne({
      where: { id: data.departmentId },
    });
      if (!department) {
      throw new Error("Department not found");
      }
      user.departmentId = data.departmentId;
    }

    if (data.full_name !== undefined) user.full_name = data.full_name;
    if (data.is_active !== undefined) user.is_active = data.is_active;

    if (data.role) {
      const roleRepo = AppDataSource.getRepository(Role);
      let role: Role | null = await roleRepo.findOne({
        where: { name: data.role },
      });
      if (!role) {
        role = roleRepo.create({ name: data.role });
        await roleRepo.save(role);
      }
      user.role = role as Role;
    }

    // Update groups if provided
    // if (data.groupIds !== undefined) {
    //   // Filter out empty strings, invalid values, and validate UUID format
    //   const validGroupIds = data.groupIds.filter((id: any) => {
    //     if (!id || typeof id !== 'string') return false;
    //     const trimmed = id.trim();
    //     // UUID format validation (8-4-4-4-12 hex pattern)
    //     const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    //     return trimmed !== '' && trimmed !== 'none' && uuidRegex.test(trimmed);
    //   });
    //   const groups = validGroupIds.length > 0
    //     ? (await this.groupRepository.find({ where: { id: In(validGroupIds) } })) as Group[]
    //     : [];
    //   user.groups = groups;
    // }

    // Update permissions if provided
    if (data.permissionIds !== undefined) {
      // Filter out empty strings, invalid values, and validate UUID format
      const validPermissionIds = data.permissionIds.filter((id: any) => {
        if (!id || typeof id !== 'string') return false;
        const trimmed = id.trim();
        // UUID format validation (8-4-4-4-12 hex pattern)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return trimmed !== '' && trimmed !== 'none' && uuidRegex.test(trimmed);
      });
      const permissions = validPermissionIds.length > 0
        ? (await this.permissionRepository.find({ where: { id: In(validPermissionIds) } })) as Permission[]
        : [];
      user.permissions = permissions;
    }

    const savedUser = await this.userRepository.save(user);

    const { password, ...userWithoutPassword } = classToPlain(savedUser) as any;
    return userWithoutPassword;
  }

  async deleteUser(id: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return null;
    }
    // Soft delete: set is_active to false instead of deleting the user
    user.is_active = false;
    const savedUser = await this.userRepository.save(user);
    return savedUser;
  }

  async getUsersWithFilters(filters: {
    search?: string;
    role?: string;
    status?: string;
  }): Promise<User[]> {
    const query = this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.role", "role")
      .leftJoinAndSelect("role.permissions", "rolePermissions")
      .leftJoinAndSelect("user.groups", "groups")
      .leftJoinAndSelect("groups.permissions", "groupPermissions")
      .leftJoinAndSelect("user.permissions", "permissions")
      .leftJoinAndSelect("user.department", "department");

    if (filters.search) {
      query.andWhere(
        "(user.full_name ILIKE :search OR user.email ILIKE :search)",
        { search: `%${filters.search}%` }
      );
    }

    if (filters.role && filters.role !== "all") {
      query.andWhere("role.name = :role", { role: filters.role });
    }

    if (filters.status) {
      const isActive = filters.status === "active";
      query.andWhere("user.is_active = :isActive", { isActive });
    }

    return query.orderBy("user.createdAt", "DESC").getMany();
  }

  async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersByRole: { role: string; count: number }[];
  }> {
    const allUsers = await this.userRepository.find({
      relations: ["role"],
    });

    const activeUsers = allUsers.filter((u) => u.is_active === true);
    const inactiveUsers = allUsers.filter((u) => u.is_active === false);

    // Count users by role
    const roleCount: { [key: string]: number } = {};
    allUsers.forEach((u) => {
      const roleName = u.role?.name || "Unassigned";
      roleCount[roleName] = (roleCount[roleName] || 0) + 1;
    });

    const usersByRole = Object.entries(roleCount).map(([role, count]) => ({
      role,
      count,
    }));

    return {
      totalUsers: allUsers.length,
      activeUsers: activeUsers.length,
      inactiveUsers: inactiveUsers.length,
      usersByRole,
    };
  }

  async getAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find({
      order: { category: "ASC", name: "ASC" },
    });
  }

  async getPermissionsByCategory(category: string): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { category },
      order: { name: "ASC" },
    });
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["role", "role.permissions", "permissions"],
    });

    if (!user) {
      return [];
    }

    // Combine role permissions and user-specific permissions
    const allPermissions = new Map<string, Permission>();

    if (user.role?.permissions) {
      user.role.permissions.forEach((p) => {
        allPermissions.set(p.id, p);
      });
    }

    if (user.permissions) {
      user.permissions.forEach((p) => {
        allPermissions.set(p.id, p);
      });
    }

    return Array.from(allPermissions.values());
  }

  async updateUserStatus(
    id: string,
    is_active: boolean
  ): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return null;
    }

    user.is_active = is_active;
    return await this.userRepository.save(user);
  }

  async updateUserRole(
    id: string,
    roleName: string
  ): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["role"],
    });

    if (!user) {
      return null;
    }

    const roleRepo = AppDataSource.getRepository(Role);
    const role = await roleRepo.findOne({ where: { name: roleName } });

    if (!role) {
      throw new Error("Role not found");
    }

    user.role = role;
    return await this.userRepository.save(user);
  }

  async updateUserPermissions(
    id: string,
    permissionIds: string[]
  ): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["permissions"],
    });

    if (!user) {
      return null;
    }

    // Validate permission IDs
    const validPermissionIds = permissionIds.filter((id: any) => {
      if (!id || typeof id !== "string") return false;
      const trimmed = id.trim();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return trimmed !== "" && trimmed !== "none" && uuidRegex.test(trimmed);
    });

    const permissions = await this.permissionRepository.find({
      where: { id: In(validPermissionIds) },
    });

    user.permissions = permissions;
    return await this.userRepository.save(user);
  }
}
