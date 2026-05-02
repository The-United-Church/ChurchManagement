import { randomUUID } from "crypto";
import { classToPlain } from "class-transformer";
import { AppDataSource } from "../../config/database";
import { User } from "../../models/user.model";
import { UserSettings, Gender } from "../../types/user";
import emailService from "../../email/email.service";
import { sendMemberAddedEmail } from "../../email/templates/email.member_added";
import { firebaseAuth } from "../../config/firebase.admin";
import { normalizeEmail } from "../../utils/email";
import { getActiveSessionStartedAt, isUserOnline } from "../socket.service";

import { In } from "typeorm";
import { Person } from "../../models/person.model";

export class UserService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly membershipRepository = AppDataSource.getRepository(require('../../models/church/branch-membership.model').BranchMembership);
  private readonly personRepository = AppDataSource.getRepository(Person);

  private serializeUserWithPresence(user: User, respectPrivacy = true): any {
    const serialized = classToPlain(user) as any;
    const showOnlineStatus = serialized.settings?.privacy?.showOnlineStatus !== false;

    if (respectPrivacy && !showOnlineStatus) {
      serialized.last_access = undefined;
      serialized.is_online = undefined;
      return serialized;
    }

    serialized.is_online = isUserOnline(serialized.id);
    const activeStartedAt = getActiveSessionStartedAt(serialized.id);
    serialized.current_session_started_at = activeStartedAt?.toISOString() ?? serialized.current_session_started_at ?? null;
    const storedSeconds = Number(serialized.total_time_spent_seconds || 0);
    const activeSeconds = activeStartedAt
      ? Math.max(0, Math.floor((Date.now() - activeStartedAt.getTime()) / 1000))
      : 0;
    serialized.total_time_spent_seconds = storedSeconds + activeSeconds;
    serialized.total_time_spent_minutes = Math.floor(serialized.total_time_spent_seconds / 60);
    return serialized;
  }

  async createUserWithGeneratedPassword(
    rawEmail: string,
    roleName: string,
    first_name?: string,
    last_name?: string,
    phone_number?: string,
    username?: string,
    context?: { branchName?: string; churchName?: string }
  ): Promise<User | null> {
    // Normalize email up-front so DB rows, Firebase records, and welcome
    // emails all reference the canonical lower-case form.
    const email = normalizeEmail(rawEmail);
    if (!email) throw new Error("A valid email address is required");

    // 1. Guard: reject duplicate email early
    const exists = await this.userRepository.findOne({ where: { email } });
    if (exists) throw new Error('User with this email already exists');

    // 2. Pre-generate a shared UUID so Firebase UID === PostgreSQL user ID
    const userId = randomUUID();

    // 3. Generate plain-text password (needed for Firebase and the welcome email only)
    const generatedPassword = Math.random().toString(36).slice(-10);

    const fullName = [first_name, last_name].filter(Boolean).join(' ') || email;

    // 4. Create Firebase Auth account first — fail fast so we never have a DB
    //    user whose email doesn't exist in Firebase
    try {
      await firebaseAuth.createUser({
        uid: userId,
        email,
        password: generatedPassword,
        displayName: fullName,
        emailVerified: false,
      });
    } catch (firebaseError: any) {
      // Surface a clear error; nothing has been written to the DB yet
      throw new Error(`Failed to create Firebase account: ${firebaseError.message}`);
    }

    // 5. Persist to PostgreSQL using the same UUID (no password stored — Firebase owns auth)
    const user = this.userRepository.create({
      id: userId,
      first_name,
      last_name,
      email,
      role: roleName,
      is_active: true,
      phone_number,
      username,
    });

    let savedUser: User;
    try {
      savedUser = await this.userRepository.save(user);
    } catch (dbError: any) {
      // Roll back the Firebase account so the two systems stay in sync
      try {
        await firebaseAuth.deleteUser(userId);
      } catch (fbRollbackError: any) {
        console.error('⚠️  Firebase rollback failed after DB error — manual cleanup may be needed for uid:', userId);
        console.error('   Rollback error:', fbRollbackError.message);
      }
      throw dbError;
    }

    // 6. Send welcome email (non-fatal — user can reset password if this fails)
    try {
      await sendMemberAddedEmail(email, {
        fullName,
        email,
        password: generatedPassword,
        branchName: context?.branchName,
        churchName: context?.churchName,
      });
    } catch (emailError: any) {
      console.error('⚠️  Failed to send member-added email, but user was created successfully');
      console.error('   User can use "Forgot Password" to reset their password');
      console.error('   Email error:', emailError.message);
    }

    return savedUser;
  }

  async createManyUsers(
    users: { first_name: string; last_name?: string; phone_number: string; email: string; roleName: string }[]
  ): Promise<{ created: User[]; existing: User[]; duplicateCount: number; uniqueCount: number; duplicates: { first_name: string; last_name?: string; phone_number: string; email: string; roleName: string }[]; convertedPersons: { email: string; first_name: string; last_name: string }[] }> {
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
    // Auto-convert any Person records whose email matches a newly created or already-existing user
    const allProcessedEmails = users.map((u) => u.email.trim().toLowerCase());
    const convertedPersons: { email: string; first_name: string; last_name: string }[] = [];
    if (allProcessedEmails.length > 0) {
      // Gather the user IDs for all processed emails (both newly created and pre-existing duplicates)
      const allMatchedUsers = [...created, ...existing];
      const emailToUserId = new Map<string, string>(
        allMatchedUsers.map((u) => [u.email.trim().toLowerCase(), u.id])
      );
      const matchingPeople = await this.personRepository
        .createQueryBuilder('p')
        .where('LOWER(p.email) IN (:...emails)', { emails: allProcessedEmails })
        .andWhere('p.converted_user_id IS NULL')
        .getMany();
      for (const person of matchingPeople) {
        const userId = emailToUserId.get(person.email.trim().toLowerCase());
        if (userId) {
          convertedPersons.push({ email: person.email, first_name: person.first_name, last_name: person.last_name });
          person.converted_user_id = userId;
          await this.personRepository.save(person);
        }
      }
    }

    return {
      created,
      existing,
      duplicateCount: duplicateUsers.length,
      uniqueCount: uniqueUsers.length,
      duplicates: duplicateUsers,
      convertedPersons,
    };
  }

  async getUsersPaginated(opts: {
    page: number;
    limit: number;
    search?: string;
    branchId?: string;
    excludeUserId?: string;
    denominationIds?: string[];
    role?: string;
    includePrivatePresence?: boolean;
  }): Promise<{ data: any[]; total: number; activeCount: number; adminCount: number }> {
    const { page, limit, search, branchId, excludeUserId, denominationIds, role, includePrivatePresence } = opts;
    const respectPrivacy = !includePrivatePresence;
    const skip = (page - 1) * limit;

    const applyCommonFilters = (qb: any) => {
      if (role) qb.andWhere('user.role = :role', { role });
      if (excludeUserId) qb.andWhere('user.id != :excludeUserId', { excludeUserId });
      if (search?.trim()) {
        qb.andWhere(
          '(user.first_name ILIKE :t OR user.last_name ILIKE :t OR user.email ILIKE :t)',
          { t: `%${search.trim()}%` }
        );
      }
    };

    if (branchId) {
      const qb = this.userRepository.createQueryBuilder('user')
        .innerJoinAndSelect('user.branchMemberships', 'bm', 'bm.branch_id = :branchId', { branchId });
      applyCommonFilters(qb);
      const [users, total] = await qb.orderBy('user.createdAt', 'DESC').skip(skip).take(limit).getManyAndCount();
      const data = users.map((u) => ({
        ...this.serializeUserWithPresence(u, respectPrivacy),
        branch_is_active: (u as any).branchMemberships?.[0]?.is_active ?? true,
        branch_role: (u as any).branchMemberships?.[0]?.role ?? null,
      }));

      const statsQb = this.userRepository.createQueryBuilder('user')
        .innerJoin('user.branchMemberships', 'bm', 'bm.branch_id = :branchId', { branchId });
      if (excludeUserId) statsQb.andWhere('user.id != :excludeUserId', { excludeUserId });
      const allBranchUsers = await statsQb
        .select(['user.id', 'user.role', 'bm.is_active'])
        .getMany();
      const activeCount = allBranchUsers.filter((u) => (u as any).branchMemberships?.[0]?.is_active !== false).length;
      const adminCount = allBranchUsers.filter((u) => u.role === 'admin' || u.role === 'super_admin').length;

      return { data, total, activeCount, adminCount };
    }

    if (denominationIds && denominationIds.length > 0) {
      const rawIds = await this.userRepository
        .createQueryBuilder('user')
        .select('DISTINCT user.id', 'id')
        .leftJoin('user.denominations', 'ud')
        .leftJoin('user.branchMemberships', 'bm')
        .leftJoin('bm.branch', 'bmb')
        .where('ud.id IN (:...denominationIds) OR bmb.denomination_id IN (:...denominationIds)', { denominationIds })
        .getRawMany();
      const ids = rawIds.map((r: any) => r.id).filter(Boolean);
      if (ids.length === 0) return { data: [], total: 0, activeCount: 0, adminCount: 0 };
      const qb = this.userRepository.createQueryBuilder('user')
        .where('user.id IN (:...ids)', { ids });
      applyCommonFilters(qb);
      const [users, total] = await qb.orderBy('user.createdAt', 'DESC').skip(skip).take(limit).getManyAndCount();

      const statsQb = this.userRepository.createQueryBuilder('user')
        .where('user.id IN (:...ids)', { ids });
      if (excludeUserId) statsQb.andWhere('user.id != :excludeUserId', { excludeUserId });
      const allUsers = await statsQb.select(['user.id', 'user.role']).getMany();
      const activeCount = total; // no branch_is_active concept here
      const adminCount = allUsers.filter((u) => u.role === 'admin' || u.role === 'super_admin').length;

      return { data: users.map((u) => this.serializeUserWithPresence(u, respectPrivacy)), total, activeCount, adminCount };
    }

    // super_admin — all users
    const qb = this.userRepository.createQueryBuilder('user');
    applyCommonFilters(qb);
    const [users, total] = await qb.orderBy('user.createdAt', 'DESC').skip(skip).take(limit).getManyAndCount();

    const statsQb = this.userRepository.createQueryBuilder('user');
    if (excludeUserId) statsQb.andWhere('user.id != :excludeUserId', { excludeUserId });
    const allUsers = await statsQb.select(['user.id', 'user.role']).getMany();
    const activeCount = total;
    const adminCount = allUsers.filter((u) => u.role === 'admin' || u.role === 'super_admin').length;

    return { data: users.map((u) => this.serializeUserWithPresence(u, respectPrivacy)), total, activeCount, adminCount };
  }

  async getAllUsers(branchId?: string, excludeUserId?: string, denominationIds?: string[]): Promise<any[]> {
    if (!branchId) {
      if (denominationIds && denominationIds.length > 0) {
        // Two-step to avoid duplicate rows from multi-join: first collect scoped IDs
        const rawIds = await this.userRepository
          .createQueryBuilder('user')
          .select('DISTINCT user.id', 'id')
          .leftJoin('user.denominations', 'ud')
          .leftJoin('user.branchMemberships', 'bm')
          .leftJoin('bm.branch', 'bmb')
          .where('ud.id IN (:...denominationIds) OR bmb.denomination_id IN (:...denominationIds)', { denominationIds })
          .getRawMany();
        const ids = rawIds.map((r: any) => r.id).filter(Boolean);
        if (ids.length === 0) return [];
        let qb = this.userRepository.createQueryBuilder('user')
          .where('user.id IN (:...ids)', { ids })
          .orderBy('user.createdAt', 'DESC');
        if (excludeUserId) qb = qb.andWhere('user.id != :excludeUserId', { excludeUserId });
        const users = await qb.getMany();
        return users.map((u) => this.serializeUserWithPresence(u));
      }
      const users = await this.userRepository.find({
        order: { createdAt: "DESC" },
      });
      return users.map((u) => this.serializeUserWithPresence(u));
    }
    let qb = this.userRepository.createQueryBuilder('user')
      .innerJoinAndSelect('user.branchMemberships', 'bm', 'bm.branch_id = :branchId', { branchId })
      .orderBy('user.createdAt', 'DESC');

    if (excludeUserId) {
      qb = qb.andWhere('user.id != :excludeUserId', { excludeUserId });
    }

    const users = await qb.getMany();

    // Attach branch-level active flag and role from the membership row
    return users.map((u) => ({
      ...this.serializeUserWithPresence(u),
      branch_is_active: (u as any).branchMemberships?.[0]?.is_active ?? true,
      branch_role: (u as any).branchMemberships?.[0]?.role ?? null,
    }));
  }

  async getUsersByRole(roleName: string, branchId?: string, excludeUserId?: string, denominationIds?: string[]): Promise<User[]> {
    if (!branchId) {
      if (denominationIds && denominationIds.length > 0) {
        const rawIds = await this.userRepository
          .createQueryBuilder('user')
          .select('DISTINCT user.id', 'id')
          .leftJoin('user.denominations', 'ud')
          .leftJoin('user.branchMemberships', 'bm')
          .leftJoin('bm.branch', 'bmb')
          .where('(ud.id IN (:...denominationIds) OR bmb.denomination_id IN (:...denominationIds))', { denominationIds })
          .andWhere('user.role = :roleName', { roleName })
          .getRawMany();
        const ids = rawIds.map((r: any) => r.id).filter(Boolean);
        if (ids.length === 0) return [];
        let qb = this.userRepository.createQueryBuilder('user')
          .where('user.id IN (:...ids)', { ids })
          .andWhere('user.role = :roleName', { roleName })
          .orderBy('user.createdAt', 'DESC');
        if (excludeUserId) qb = qb.andWhere('user.id != :excludeUserId', { excludeUserId });
        return qb.getMany();
      }
      return this.userRepository.find({
        where: { role: roleName },
        order: { createdAt: "DESC" },
      });
    }
    let qb = this.userRepository.createQueryBuilder('user')
      .innerJoin('user.branchMemberships', 'bm', 'bm.branch_id = :branchId', { branchId })
      .where('user.role = :roleName', { roleName });

    if (excludeUserId) {
      qb = qb.andWhere('user.id != :excludeUserId', { excludeUserId });
    }

    return qb.orderBy('user.createdAt', 'DESC').getMany();
  }

  async getUserById(id: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: [
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
      relations: [
        "denominations",
        "denominations.branches",
        "branchMemberships",
        "branchMemberships.branch",
        "branchMemberships.branch.denomination",
        "branchMemberships.branch.denomination.branches",
      ],
    });

    // Merge BOTH: churches the user directly admins AND churches they belong to
    // via branch membership. A user can be admin of their own church AND a member
    // of another church's branch simultaneously.
    const churchMap = new Map<string, any>();

    // Admin-owned denominations
    for (const denom of (user?.denominations ?? [])) {
      churchMap.set(denom.id, denom);
    }

    // Branch-membership derived denominations
    for (const membership of (user?.branchMemberships ?? [])) {
      const branch = (membership as any).branch;
      if (branch?.denomination && !churchMap.has(branch.denomination.id)) {
        churchMap.set(branch.denomination.id, branch.denomination);
      }
    }

    return Array.from(churchMap.values());
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

    const editableFields: Array<keyof User> = [
      "first_name",
      "last_name",
      "middle_name",
      "nick_name",
      "username",
      "full_name",
      "address_line",
      "state",
      "city",
      "postal_code",
      "country",
      "phone_number",
      "phone_is_whatsapp",
      "dob",
      "job_title",
      "employer",
      "facebook_link",
      "instagram_link",
      "linkedin_link",
      "twitter_link",
      "whatsapp_link",
      "website_link",
      "is_display_email",
      "is_accept_text",
      "marital_status",
      "date_married",
      "grade",
      "baptism_date",
      "baptism_location",
      "member_status",
      "family_members",
      "gender",
      "profile_img",
    ];

    // Replace empty strings with null so typed columns (e.g. date) don't
    // receive an invalid "" value from the client.
    const sanitized = Object.fromEntries(
      Object.entries(data)
        .filter(([k]) => editableFields.includes(k as keyof User))
        .map(([k, v]) => [k, v === "" ? null : v])
    ) as Partial<User>;

    if (
      sanitized.full_name === undefined &&
      (sanitized.first_name !== undefined || sanitized.last_name !== undefined)
    ) {
      const first = sanitized.first_name ?? existingUser.first_name;
      const last = sanitized.last_name ?? existingUser.last_name;
      const composed = [first, last].filter(Boolean).join(" ").trim();
      if (composed) sanitized.full_name = composed;
    }

    const updatedUser = {
      ...existingUser,
      ...sanitized,
    };

    const savedUser = await this.userRepository.save(updatedUser);

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

    user.settings = {
      ...(user.settings || {}),
      ...settings,
      privacy: {
        ...(user.settings?.privacy || {}),
        ...(settings.privacy || {}),
      },
      notifications: {
        ...(user.settings?.notifications || {}),
        ...(settings.notifications || {}),
      },
      security: {
        ...(user.settings?.security || {}),
        ...(settings.security || {}),
      },
    } as UserSettings;
    const savedUser = this.userRepository.save(user);

    const { password, ...userWithoutPassword } = classToPlain(savedUser) as any;
    return userWithoutPassword;
  }

  async updateUserInfo(
    id: string,
    data: {
      full_name?: string;
      first_name?: string;
      last_name?: string;
      middle_name?: string;
      nick_name?: string;
      phone_number?: string;
      phone_is_whatsapp?: boolean;
      dob?: string | Date | null;
      gender?: string;
      marital_status?: string | null;
      date_married?: string | Date | null;
      address_line?: string;
      city?: string;
      state?: string;
      country?: string;
      postal_code?: string;
      username?: string;
      job_title?: string;
      employer?: string;
      facebook_link?: string;
      instagram_link?: string;
      linkedin_link?: string;
      twitter_link?: string;
      whatsapp_link?: string;
      website_link?: string;
      is_display_email?: boolean;
      is_accept_text?: boolean;
      grade?: string;
      baptism_date?: string | Date | null;
      baptism_location?: string;
      member_status?: string;
      role?: string;
      is_active?: boolean;
      departmentId?: number;
      groupIds?: string[];
    }
  ): Promise<Omit<User, "password"> | null> {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    if (!user) return null;

    // Whitelist of fields an admin is allowed to edit. Email, password,
    // refresh tokens, role escalation flags etc. are intentionally excluded
    // from this generic profile-update path.
    const stringFields: Array<keyof typeof data & keyof User> = [
      "full_name",
      "first_name",
      "last_name",
      "middle_name",
      "nick_name",
      "phone_number",
      "address_line",
      "city",
      "state",
      "country",
      "postal_code",
      "username",
      "job_title",
      "employer",
      "facebook_link",
      "instagram_link",
      "linkedin_link",
      "twitter_link",
      "whatsapp_link",
      "website_link",
      "baptism_location",
      "grade",
      "member_status",
    ];

    if (data.phone_is_whatsapp !== undefined) {
      (user as any).phone_is_whatsapp = data.phone_is_whatsapp;
    }

    if (data.marital_status !== undefined) {
      (user as any).marital_status = data.marital_status === '' ? null : data.marital_status;
    }

    if (data.date_married !== undefined) {
      if (data.date_married === null || data.date_married === '') {
        (user as any).date_married = null;
      } else {
        const d = data.date_married instanceof Date ? data.date_married : new Date(data.date_married as string);
        (user as any).date_married = isNaN(d.getTime()) ? (user as any).date_married : d;
      }
    }
    for (const field of stringFields) {
      const incoming = (data as any)[field];
      if (incoming !== undefined) {
        const trimmed = typeof incoming === "string" ? incoming.trim() : incoming;
        (user as any)[field] = trimmed === "" ? null : trimmed;
      }
    }

    if (data.dob !== undefined) {
      if (data.dob === null || data.dob === "") {
        user.dob = null as any;
      } else {
        const d = data.dob instanceof Date ? data.dob : new Date(data.dob);
        user.dob = isNaN(d.getTime()) ? user.dob : (d as any);
      }
    }

    if (data.gender !== undefined) {
      const g = typeof data.gender === "string" ? data.gender.trim().toUpperCase() : "";
      (user as any).gender = g === Gender.MALE || g === Gender.FEMALE || g === Gender.OTHER ? g as Gender : null;
    }

    // Auto-derive full_name when first/last changed but full_name was not
    // explicitly provided, so the column never goes out of sync.
    if (data.full_name === undefined && (data.first_name !== undefined || data.last_name !== undefined)) {
      const composed = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
      if (composed) user.full_name = composed;
    }

    if (data.is_display_email !== undefined) (user as any).is_display_email = data.is_display_email;
    if (data.is_accept_text !== undefined) (user as any).is_accept_text = data.is_accept_text;
    if (data.baptism_date !== undefined) {
      if (data.baptism_date === null || data.baptism_date === '') {
        (user as any).baptism_date = null;
      } else {
        const d = data.baptism_date instanceof Date ? data.baptism_date : new Date(data.baptism_date as string);
        (user as any).baptism_date = isNaN(d.getTime()) ? (user as any).baptism_date : d;
      }
    }
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
      .createQueryBuilder("user");

    if (filters.search) {
      query.andWhere(
        "(user.full_name ILIKE :search OR user.email ILIKE :search)",
        { search: `%${filters.search}%` }
      );
    }

    if (filters.role && filters.role !== "all") {
      query.andWhere("user.role = :role", { role: filters.role });
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
    onlineUsers: number;
    mostActiveUser: { id: string; email: string; full_name?: string; total_time_spent_seconds: number } | null;
    usersByRole: { role: string; count: number }[];
  }> {
    const allUsers = await this.userRepository.find();

    const activeUsers = allUsers.filter((u) => u.is_active === true);
    const inactiveUsers = allUsers.filter((u) => u.is_active === false);
    const serializedUsers = allUsers.map((u) => this.serializeUserWithPresence(u, false));
    const onlineUsers = serializedUsers.filter((u) => u.is_online).length;
    const mostActive = serializedUsers.reduce<any | null>((best, user) => {
      if (!best) return user;
      return Number(user.total_time_spent_seconds || 0) > Number(best.total_time_spent_seconds || 0) ? user : best;
    }, null);

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
      onlineUsers,
      mostActiveUser: mostActive
        ? {
            id: mostActive.id,
            email: mostActive.email,
            full_name: mostActive.full_name,
            total_time_spent_seconds: Number(mostActive.total_time_spent_seconds || 0),
          }
        : null,
      usersByRole,
    };
  }

  getUserPermissions(userId: string): string[] {
    // Permissions are derived from the user's role via the static roles utility
    // Import done inline to avoid circular deps
    const { getPermissionsForRole } = require('../../utils/roles');
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

  async deleteManyUsers(ids: string[]): Promise<{ deleted: number; notFound: string[] }> {
    const notFound: string[] = [];
    let deleted = 0;
    for (const id of ids) {
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) { notFound.push(id); continue; }
      user.is_active = false;
      await this.userRepository.save(user);
      deleted++;
    }
    return { deleted, notFound };
  }

  // ─── Directory (global user search, no branch scope) ────────────────────
  async searchAllUsers(
    search?: string,
    opts?: { isAdminLike?: boolean; requesterId?: string }
  ): Promise<any[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id', 'user.email', 'user.full_name', 'user.first_name',
        'user.last_name', 'user.middle_name', 'user.nick_name', 'user.username',
        'user.role', 'user.is_active', 'user.address_line', 'user.state',
        'user.city', 'user.country', 'user.postal_code', 'user.phone_number',
        'user.phone_is_whatsapp', 'user.dob', 'user.gender', 'user.marital_status',
        'user.date_married', 'user.job_title', 'user.employer', 'user.facebook_link',
        'user.instagram_link', 'user.linkedin_link', 'user.twitter_link',
        'user.whatsapp_link', 'user.website_link',
        'user.is_display_email', 'user.is_accept_text', 'user.grade', 'user.baptism_date',
        'user.baptism_location', 'user.member_status',
        'user.family_members',
        'user.settings', 'user.last_access', 'user.profile_img',
      ])
      .where('user.is_active = :active', { active: true });

    if (search?.trim()) {
      query.andWhere(
        '(user.full_name ILIKE :s OR user.email ILIKE :s OR user.first_name ILIKE :s OR user.last_name ILIKE :s)',
        { s: `%${search.trim()}%` },
      );
    }

    const all = await query.orderBy('user.full_name', 'ASC').limit(500).getMany();

    // Privacy enforcement: hide users with isProfileVisible = 'private' from non-admins.
    // Always show the requester themselves.
    if (opts?.isAdminLike) return all.slice(0, 100).map((u) => this.serializeUserWithPresence(u));
    return all
      .filter((u) => {
        if (opts?.requesterId && u.id === opts.requesterId) return true;
        const v = u.settings?.privacy?.isProfileVisible;
        return v !== 'private';
      })
      .slice(0, 100)
      .map((u) => {
        // Strip fields the user opted out of exposing.
        const p = u.settings?.privacy || {};
        const clone: any = this.serializeUserWithPresence(u);
        if (p.showEmail === false) clone.email = undefined;
        if (p.showPhoneNumber === false) {
          clone.phone_number = undefined;
          clone.phone_is_whatsapp = undefined;
        }
        if (p.showFamilyMembers === false) clone.family_members = undefined;
        if (p.showLocation === false) {
          clone.address_line = undefined;
          clone.city = undefined;
          clone.state = undefined;
          clone.country = undefined;
          clone.postal_code = undefined;
        }
        if (p.showBirthYear === false && clone.dob) {
          // Keep month/day but hide the year by replacing it with '0000'
          const dobStr = clone.dob instanceof Date
            ? clone.dob.toISOString().slice(0, 10)
            : String(clone.dob).slice(0, 10);
          clone.dob = '0000' + dobStr.slice(4);
        }
        if (p.showMaritalStatus === false) {
          clone.marital_status = undefined;
          clone.date_married = undefined;
        }
        if (p.showSocialLinks === false) {
          clone.facebook_link = undefined;
          clone.instagram_link = undefined;
          clone.linkedin_link = undefined;
          clone.twitter_link = undefined;
          clone.whatsapp_link = undefined;
          clone.website_link = undefined;
        }
        if (p.showWork === false) {
          clone.job_title = undefined;
          clone.employer = undefined;
        }
        if (p.showMembership === false) {
          clone.member_status = undefined;
          clone.baptism_date = undefined;
          clone.baptism_location = undefined;
          clone.grade = undefined;
        }
        if (p.showOnlineStatus === false) {
          clone.last_access = undefined;
          clone.is_online = undefined;
        }
        return clone as User;
      });
  }

  async findActiveUserByEmail(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.first_name',
        'user.last_name',
        'user.middle_name',
        'user.nick_name',
        'user.dob',
        'user.gender',
        'user.marital_status',
        'user.address_line',
        'user.state',
        'user.city',
        'user.country',
        'user.phone_number',
        'user.profile_img',
      ])
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .andWhere('user.is_active = :active', { active: true })
      .getOne();
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .getOne();
  }

  async findUsersByEmails(emails: string[]): Promise<User[]> {
    if (emails.length === 0) return [];
    const normalized = emails.map((e) => e.trim().toLowerCase());
    return this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) IN (:...emails)', { emails: normalized })
      .getMany();
  }

  // ─── Branch helpers ─────────────────────────────────────────────────────
  async updateMemberBranchRole(userId: string, branchId: string, role: string): Promise<any | null> {
    const { BranchRole } = require('../../models/church/branch-membership.model');
    const membership = await this.membershipRepository.findOne({ where: { user_id: userId, branch_id: branchId } });
    if (!membership) return null;
    membership.role = BranchRole[role.toUpperCase()] ?? BranchRole.MEMBER;
    return await this.membershipRepository.save(membership);
  }

  async updateMemberBranchStatus(userId: string, branchId: string, is_active: boolean): Promise<any | null> {
    const membership = await this.membershipRepository.findOne({ where: { user_id: userId, branch_id: branchId } });
    if (!membership) return null;
    membership.is_active = is_active;
    return await this.membershipRepository.save(membership);
  }

  async addUserToBranch(userId: string, branchId: string, role: 'member' | 'coordinator' | 'admin' = 'member'): Promise<void> {
    const existing = await this.membershipRepository.findOne({ where: { user_id: userId, branch_id: branchId } });
    if (existing) return;
    const { BranchMembership, BranchRole } = require('../../models/church/branch-membership.model');
    const membership = this.membershipRepository.create({
      user_id: userId,
      branch_id: branchId,
      role: (BranchRole[role.toUpperCase()] ?? BranchRole.MEMBER)
    });
    await this.membershipRepository.save(membership);
  }
}
