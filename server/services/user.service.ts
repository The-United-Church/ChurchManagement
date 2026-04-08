import { classToPlain } from "class-transformer";
import { AppDataSource } from "../config/database";
import { User } from "../models/user.model";
import { UserSettings } from "../types/user";
import emailService from "../email/email.service";

import { In } from "typeorm";

export class UserService {
  private readonly userRepository = AppDataSource.getRepository(User);

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

    // Create user
    const user = this.userRepository.create({
      first_name,
      last_name,
      email,
      password_hash,
      role: roleName,
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
      relations: ["groups", "department"],
      order: { createdAt: "DESC" },
    });
  }

  async getUsersByRole(roleName: string): Promise<User[]> {
    return this.userRepository.find({
      where: { role: roleName },
      relations: ["groups", "department"],
      order: { createdAt: "DESC" },
    });
  }

  async getUserById(id: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: [
        "groups",
        "department",
        "denominations",
        "denominations.branches",
        "branchMemberships",
        "branchMemberships.branch",
      ],
    });
    return user ? classToPlain(user) : null;
  }

  async getUserChurches(userId: string): Promise<any[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["denominations", "denominations.branches"],
    });
    return user?.denominations ?? [];
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
    }
  ): Promise<Omit<User, "password"> | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["groups", "department"],
    });
    if (!user) return null;

    if (data.full_name !== undefined) user.full_name = data.full_name;
    if (data.is_active !== undefined) user.is_active = data.is_active;
    if (data.role !== undefined) user.role = data.role;

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
    const allUsers = await this.userRepository.find();

    const activeUsers = allUsers.filter((u) => u.is_active === true);
    const inactiveUsers = allUsers.filter((u) => u.is_active === false);

    const roleCount: { [key: string]: number } = {};
    allUsers.forEach((u) => {
      const roleName = u.role || "Unassigned";
      roleCount[roleName] = (roleCount[roleName] || 0) + 1;
    });

    const usersByRole = Object.entries(roleCount).map(([role, count]) => ({ role, count }));

    return {
      totalUsers: allUsers.length,
      activeUsers: activeUsers.length,
      inactiveUsers: inactiveUsers.length,
      usersByRole,
    };
  }

  getUserPermissions(userId: string): string[] {
    // Permissions are derived from the user's role via the static roles utility
    // Import done inline to avoid circular deps
    const { getPermissionsForRole } = require('../utils/roles');
    return getPermissionsForRole(userId); // caller should pass role name, kept for compat
  }

  async updateUserStatus(id: string, is_active: boolean): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) return null;
    user.is_active = is_active;
    return await this.userRepository.save(user);
  }

  async updateUserRole(
    id: string,
    roleName: string
  ): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) return null;
    user.role = roleName;
    return await this.userRepository.save(user);
  }
}
