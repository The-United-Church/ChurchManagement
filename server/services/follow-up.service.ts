import { Repository, Between, In, IsNull, LessThan } from "typeorm";
import { AppDataSource } from "../config/database";
import {
  FollowUp,
  FollowUpStatus,
  FollowUpPriority,
  FollowUpType,
  FollowUpContactLog,
  FollowUpNotificationChannel,
  FollowUpNotificationLog,
  FollowUpNotificationType,
  FollowUpSavedFilter,
  ContactMethod,
  ContactOutcome,
} from "../models/follow-up.model";
import { User } from "../models/user.model";
import { BranchRole } from "../models/church/branch-membership.model";
import { EventCategory, EventStatus } from "../models/event";
import { sendFollowUpNotificationEmail } from "../email/templates/email.follow_up";
import { createInAppNotification } from "./notification.service";
import CustomError from "../utils/customError";

export interface FollowUpFilters {
  branchId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: FollowUpStatus | FollowUpStatus[];
  type?: FollowUpType | FollowUpType[];
  priority?: FollowUpPriority | FollowUpPriority[];
  assigneeId?: string;
  createdById?: string;
  from?: string;
  to?: string;
  overdueOnly?: boolean;
}

export interface CreateFollowUpDTO {
  type?: FollowUpType;
  status?: FollowUpStatus;
  priority?: FollowUpPriority;
  person_id?: string | null;
  user_id?: string | null;
  assigned_to?: string | null;
  scheduled_date?: string | null;
  notes?: string | null;
  related_event_id?: string | null;
  branch_id: string;
  created_by?: string | null;
}

export interface UpdateFollowUpDTO {
  type?: FollowUpType;
  status?: FollowUpStatus;
  priority?: FollowUpPriority;
  assigned_to?: string | null;
  scheduled_date?: string | null;
  notes?: string | null;
  outcome_notes?: string | null;
}

export interface CreateContactLogDTO {
  method: ContactMethod;
  outcome: ContactOutcome;
  notes?: string | null;
  contacted_at?: string;
  contacted_by: string;
}

export class FollowUpService {
  private readonly repo: Repository<FollowUp> = AppDataSource.getRepository(FollowUp);
  private readonly logRepo: Repository<FollowUpContactLog> =
    AppDataSource.getRepository(FollowUpContactLog);
  private readonly notificationLogRepo: Repository<FollowUpNotificationLog> =
    AppDataSource.getRepository(FollowUpNotificationLog);
  private readonly savedFilterRepo: Repository<FollowUpSavedFilter> =
    AppDataSource.getRepository(FollowUpSavedFilter);

  private readonly followUpsLink = process.env.CLIENT_URL
    ? `${process.env.CLIENT_URL.replace(/\/$/, "")}/dashboard?section=followups`
    : "/dashboard?section=followups";

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private userName(user?: Partial<User> | null): string {
    if (!user) return "there";
    return user.full_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "there";
  }

  private followUpTargetName(followUp: FollowUp): string {
    const person = followUp.person as any;
    if (person) {
      return person.full_name || [person.first_name, person.last_name].filter(Boolean).join(" ") || person.email || person.phone || "a visitor";
    }
    return this.userName(followUp.user) || "a member";
  }

  private allowsFollowUpEmail(user?: User | null): boolean {
    if (!user?.email) return false;
    const notifications = user.settings?.notifications as any;
    return notifications?.email !== false && notifications?.followUpsEmail !== false;
  }

  private async reserveNotification(
    followUpId: string,
    userId: string,
    type: FollowUpNotificationType,
    channel: FollowUpNotificationChannel,
    sentForDate = this.todayIso(),
  ): Promise<boolean> {
    const existing = await this.notificationLogRepo.findOne({
      where: { follow_up_id: followUpId, user_id: userId, type, channel, sent_for_date: sentForDate },
    });
    if (existing) return false;

    try {
      await this.notificationLogRepo.save({
        follow_up_id: followUpId,
        user_id: userId,
        type,
        channel,
        sent_for_date: sentForDate,
      });
      return true;
    } catch (err: any) {
      if (err?.code === "23505") return false;
      throw err;
    }
  }

  private async notifyInApp(
    followUp: FollowUp,
    userId: string,
    notificationType: FollowUpNotificationType,
    title: string,
    message: string,
    sentForDate = this.todayIso(),
  ): Promise<void> {
    const reserved = await this.reserveNotification(
      followUp.id,
      userId,
      notificationType,
      FollowUpNotificationChannel.IN_APP,
      sentForDate,
    );
    if (!reserved) return;
    await createInAppNotification({
      recipientId: userId,
      type: "system",
      title,
      message,
      link: "/dashboard?section=followups",
      metadata: { followUpId: followUp.id, branchId: followUp.branch_id, notificationType },
    });
  }

  private async notifyEmail(
    followUp: FollowUp,
    user: User,
    notificationType: FollowUpNotificationType,
    title: string,
    message: string,
    sentForDate = this.todayIso(),
  ): Promise<void> {
    if (!this.allowsFollowUpEmail(user)) return;
    const reserved = await this.reserveNotification(
      followUp.id,
      user.id,
      notificationType,
      FollowUpNotificationChannel.EMAIL,
      sentForDate,
    );
    if (!reserved) return;
    await sendFollowUpNotificationEmail(user.email, {
      recipientName: this.userName(user),
      title,
      message,
      actionUrl: this.followUpsLink,
    });
  }

  private async getHydratedFollowUp(id: string): Promise<FollowUp | null> {
    return this.repo.findOne({
      where: { id },
      relations: ["person", "user", "assignee", "creator"],
    });
  }

  private async getBranchAdmins(branchId: string): Promise<User[]> {
    return AppDataSource.getRepository(User)
      .createQueryBuilder("u")
      .innerJoin("u.branchMemberships", "bm", "bm.branch_id = :branchId AND bm.is_active = true", { branchId })
      .where("bm.role = :role", { role: BranchRole.ADMIN })
      .andWhere("u.is_active = true")
      .getMany();
  }

  private async notifyAssigneeAssigned(followUp: FollowUp): Promise<void> {
    if (!followUp.assigned_to || !followUp.assignee) return;
    const targetName = this.followUpTargetName(followUp);
    await this.notifyInApp(
      followUp,
      followUp.assigned_to,
      FollowUpNotificationType.ASSIGNED,
      "You were assigned a follow-up",
      `You have been assigned to follow up with ${targetName}.`,
    );
  }

  private async notifyAdminsCompleted(followUp: FollowUp): Promise<void> {
    const admins = await this.getBranchAdmins(followUp.branch_id);
    const targetName = this.followUpTargetName(followUp);
    const assigneeName = this.userName(followUp.assignee);
    await Promise.all(admins.map((admin) => this.notifyInApp(
      followUp,
      admin.id,
      FollowUpNotificationType.COMPLETED_ADMIN,
      "Follow-up completed",
      `${assigneeName} completed a follow-up for ${targetName}.`,
    )));
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  async create(data: CreateFollowUpDTO): Promise<FollowUp> {
    if (!data.person_id && !data.user_id) {
      throw new CustomError("Follow-up must reference a person or member", 400);
    }
    const entity = this.repo.create({
      ...data,
      type: data.type ?? FollowUpType.GENERAL,
      status: data.status ?? FollowUpStatus.PENDING,
      priority: data.priority ?? FollowUpPriority.MEDIUM,
    } as Partial<FollowUp>);
    const saved = await this.repo.save(entity);
    const hydrated = await this.getHydratedFollowUp(saved.id);
    if (hydrated) await this.notifyAssigneeAssigned(hydrated);
    return hydrated ?? saved;
  }

  async findById(id: string): Promise<FollowUp | null> {
    return this.repo.findOne({
      where: { id },
      relations: ["person", "user", "assignee", "creator", "contact_logs", "contact_logs.contactor"],
    });
  }

  async update(id: string, data: UpdateFollowUpDTO): Promise<FollowUp> {
    const fu = await this.repo.findOneBy({ id });
    if (!fu) throw new CustomError("Follow-up not found", 404);

    const previousStatus = fu.status;
    const previousAssignedTo = fu.assigned_to;

    // Auto-stamp completed_date when transitioning into a terminal state
    if (data.status && data.status !== fu.status) {
      if (data.status === FollowUpStatus.COMPLETED || data.status === FollowUpStatus.CANCELLED) {
        (fu as any).completed_date = new Date();
      } else {
        (fu as any).completed_date = null;
      }
    }

    Object.assign(fu, data);
    const saved = await this.repo.save(fu);
    const hydrated = await this.getHydratedFollowUp(saved.id);
    if (hydrated && data.assigned_to && data.assigned_to !== previousAssignedTo) {
      await this.notifyAssigneeAssigned(hydrated);
    }
    if (hydrated && previousStatus !== FollowUpStatus.COMPLETED && hydrated.status === FollowUpStatus.COMPLETED) {
      await this.notifyAdminsCompleted(hydrated);
    }
    return hydrated ?? saved;
  }

  async remove(ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const result = await this.repo.delete(ids);
    return result.affected ?? 0;
  }

  async assignMany(ids: string[], assignedTo: string | null): Promise<number> {
    if (!ids.length) return 0;
    const result = await this.repo
      .createQueryBuilder()
      .update(FollowUp)
      .set({ assigned_to: assignedTo })
      .whereInIds(ids)
      .execute();
    if (assignedTo && result.affected) {
      const rows = await this.repo.find({
        where: { id: In(ids) },
        relations: ["person", "user", "assignee"],
      });
      await Promise.all(rows.map((row) => this.notifyAssigneeAssigned(row)));
    }
    return result.affected ?? 0;
  }

  async setStatusMany(ids: string[], status: FollowUpStatus): Promise<number> {
    if (!ids.length) return 0;
    const before = status === FollowUpStatus.COMPLETED
      ? await this.repo.find({ where: { id: In(ids) }, select: ["id", "status"] })
      : [];
    const newlyCompletedIds = new Set(before.filter((row) => row.status !== FollowUpStatus.COMPLETED).map((row) => row.id));
    const completed_date =
      status === FollowUpStatus.COMPLETED || status === FollowUpStatus.CANCELLED
        ? new Date()
        : null;
    const result = await this.repo
      .createQueryBuilder()
      .update(FollowUp)
      .set({ status, completed_date })
      .whereInIds(ids)
      .execute();
    if (status === FollowUpStatus.COMPLETED && newlyCompletedIds.size > 0) {
      const rows = await this.repo.find({
        where: { id: In([...newlyCompletedIds]) },
        relations: ["person", "user", "assignee"],
      });
      await Promise.all(rows.map((row) => this.notifyAdminsCompleted(row)));
    }
    return result.affected ?? 0;
  }

  async autoAssignUnassigned(branchId: string): Promise<number> {
    const candidates = await AppDataSource.getRepository(User)
      .createQueryBuilder("u")
      .innerJoin("u.branchMemberships", "bm", "bm.user_id = u.id")
      .where("bm.branch_id = :branchId", { branchId })
      .andWhere("bm.is_active = true")
      .andWhere("bm.role IN (:...roles)", { roles: [BranchRole.ADMIN, BranchRole.COORDINATOR] })
      .andWhere("u.is_active = true")
      .getMany();

    if (candidates.length === 0) throw new CustomError("No active admins or coordinators found for this branch", 400);

    const followUps = await this.repo.find({
      where: {
        branch_id: branchId,
        assigned_to: IsNull(),
        status: In([FollowUpStatus.PENDING, FollowUpStatus.IN_PROGRESS]),
      },
      relations: ["person", "user", "assignee"],
      order: { scheduled_date: "ASC", created_at: "ASC" },
    });

    if (followUps.length === 0) return 0;

    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    for (let index = 0; index < followUps.length; index++) {
      const assignee = shuffled[index % shuffled.length];
      followUps[index].assigned_to = assignee.id;
      followUps[index].assignee = assignee;
      await this.repo.save(followUps[index]);
      await this.notifyAssigneeAssigned(followUps[index]);
    }

    return followUps.length;
  }

  // ─── Listing ──────────────────────────────────────────────────────────────
  async findPaginated(filters: FollowUpFilters): Promise<{ data: FollowUp[]; total: number }> {
    const {
      branchId,
      page = 1,
      limit = 25,
      search,
      status,
      type,
      priority,
      assigneeId,
      createdById,
      from,
      to,
      overdueOnly,
    } = filters;

    const qb = this.repo
      .createQueryBuilder("f")
      .leftJoinAndSelect("f.person", "person")
      .leftJoinAndSelect("f.user", "user")
      .leftJoinAndSelect("f.assignee", "assignee")
      .leftJoinAndSelect("f.creator", "creator")
      .where("f.branch_id = :branchId", { branchId });

    if (status) {
      const arr = Array.isArray(status) ? status : [status];
      qb.andWhere("f.status IN (:...status)", { status: arr });
    }
    if (type) {
      const arr = Array.isArray(type) ? type : [type];
      qb.andWhere("f.type IN (:...type)", { type: arr });
    }
    if (priority) {
      const arr = Array.isArray(priority) ? priority : [priority];
      qb.andWhere("f.priority IN (:...priority)", { priority: arr });
    }
    if (assigneeId) qb.andWhere("f.assigned_to = :assigneeId", { assigneeId });
    if (createdById) qb.andWhere("f.created_by = :createdById", { createdById });
    if (from) qb.andWhere("f.scheduled_date >= :from", { from });
    if (to) qb.andWhere("f.scheduled_date <= :to", { to });
    if (overdueOnly) {
      qb.andWhere("f.status IN (:...openStatuses)", {
        openStatuses: [FollowUpStatus.PENDING, FollowUpStatus.IN_PROGRESS],
      });
      qb.andWhere("f.scheduled_date IS NOT NULL AND f.scheduled_date < CURRENT_DATE");
    }
    if (search?.trim()) {
      qb.andWhere(
        `(person.first_name ILIKE :s OR person.last_name ILIKE :s OR person.email ILIKE :s OR person.phone ILIKE :s
          OR user.first_name ILIKE :s OR user.last_name ILIKE :s OR user.email ILIKE :s OR user.phone_number ILIKE :s
          OR f.notes ILIKE :s)`,
        { s: `%${search.trim()}%` },
      );
    }

    // TypeORM's orderBy parser splits on the first "." to resolve the alias,
    // so "CASE f.priority WHEN..." yields "CASE f" as the alias — not found.
    // Fix: expose the expression as a SELECT alias, then order by the bare name.
    qb.addSelect(
      `CASE f.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`,
      "priority_rank",
    )
      .orderBy("priority_rank", "ASC")
      .addOrderBy("f.scheduled_date", "ASC", "NULLS LAST")
      .addOrderBy("f.created_at", "DESC");

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  // ─── Stats / Analytics ────────────────────────────────────────────────────
  async getStats(branchId: string): Promise<{
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    overdue: number;
    completedThisMonth: number;
    pendingThisMonth: number;
    completionRate: number;
    byType: { type: string; count: number }[];
    byAssignee: { assignee_id: string | null; assignee_name: string | null; count: number }[];
  }> {
    const base = this.repo.createQueryBuilder("f").where("f.branch_id = :branchId", { branchId });

    const counts = await base
      .clone()
      .select("f.status", "status")
      .addSelect("COUNT(*)::int", "count")
      .groupBy("f.status")
      .getRawMany();

    const map = (s: string) => Number(counts.find((c) => c.status === s)?.count || 0);
    const pending = map("pending");
    const in_progress = map("in_progress");
    const completed = map("completed");
    const cancelled = map("cancelled");

    const overdue = await base
      .clone()
      .andWhere("f.status IN (:...openStatuses)", {
        openStatuses: [FollowUpStatus.PENDING, FollowUpStatus.IN_PROGRESS],
      })
      .andWhere("f.scheduled_date IS NOT NULL AND f.scheduled_date < CURRENT_DATE")
      .getCount();

    const completedThisMonth = await base
      .clone()
      .andWhere("f.status = :s", { s: FollowUpStatus.COMPLETED })
      .andWhere("date_trunc('month', f.completed_date) = date_trunc('month', NOW())")
      .getCount();

    const pendingThisMonth = await base
      .clone()
      .andWhere("f.status IN (:...openStatuses)", {
        openStatuses: [FollowUpStatus.PENDING, FollowUpStatus.IN_PROGRESS],
      })
      .andWhere(
        "f.scheduled_date IS NOT NULL AND date_trunc('month', f.scheduled_date) = date_trunc('month', NOW())",
      )
      .getCount();

    const totalResolvable = completed + pending + in_progress;
    const completionRate = totalResolvable === 0 ? 0 : Math.round((completed / totalResolvable) * 100);

    const byType = await base
      .clone()
      .select("f.type", "type")
      .addSelect("COUNT(*)::int", "count")
      .groupBy("f.type")
      .getRawMany();

    const byAssignee = await base
      .clone()
      .leftJoin("f.assignee", "a")
      .select("f.assigned_to", "assignee_id")
      .addSelect("COALESCE(a.first_name || ' ' || a.last_name, a.full_name, a.email)", "assignee_name")
      .addSelect("COUNT(*)::int", "count")
      .groupBy("f.assigned_to")
      .addGroupBy("a.first_name")
      .addGroupBy("a.last_name")
      .addGroupBy("a.full_name")
      .addGroupBy("a.email")
      .orderBy("count", "DESC")
      .getRawMany();

    return {
      pending,
      in_progress,
      completed,
      cancelled,
      overdue,
      completedThisMonth,
      pendingThisMonth,
      completionRate,
      byType: byType.map((r) => ({ type: r.type, count: Number(r.count) })),
      byAssignee: byAssignee.map((r) => ({
        assignee_id: r.assignee_id,
        assignee_name: r.assignee_name || null,
        count: Number(r.count),
      })),
    };
  }

  // ─── Conversion funnel: visitor → followed up → returning → converted ────
  async getConversionFunnel(
    branchId: string,
    months = 6,
  ): Promise<{ visitors: number; withFollowUps: number; reached: number; converted: number }> {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const visitorsRow = await AppDataSource
      .getRepository("people")
      .createQueryBuilder("p")
      .where("p.branch_id = :branchId", { branchId })
      .andWhere("p.created_at >= :since", { since })
      .getCount();

    const withFollowUps = await this.repo
      .createQueryBuilder("f")
      .where("f.branch_id = :branchId", { branchId })
      .andWhere("f.created_at >= :since", { since })
      .andWhere("f.person_id IS NOT NULL")
      .select("COUNT(DISTINCT f.person_id)", "c")
      .getRawOne();

    const reached = await this.repo
      .createQueryBuilder("f")
      .innerJoin("f.contact_logs", "log")
      .where("f.branch_id = :branchId", { branchId })
      .andWhere("f.created_at >= :since", { since })
      .andWhere("f.person_id IS NOT NULL")
      .andWhere("log.outcome = :reached", { reached: ContactOutcome.REACHED })
      .select("COUNT(DISTINCT f.person_id)", "c")
      .getRawOne();

    const converted = await AppDataSource
      .getRepository("people")
      .createQueryBuilder("p")
      .where("p.branch_id = :branchId", { branchId })
      .andWhere("p.created_at >= :since", { since })
      .andWhere("p.converted_user_id IS NOT NULL")
      .getCount();

    return {
      visitors: visitorsRow,
      withFollowUps: Number(withFollowUps?.c || 0),
      reached: Number(reached?.c || 0),
      converted,
    };
  }

  // ─── Contact log ──────────────────────────────────────────────────────────
  async addContactLog(
    followUpId: string,
    data: CreateContactLogDTO,
  ): Promise<FollowUpContactLog> {
    const fu = await this.repo.findOneBy({ id: followUpId });
    if (!fu) throw new CustomError("Follow-up not found", 404);

    const log = this.logRepo.create({
      follow_up_id: followUpId,
      method: data.method,
      outcome: data.outcome,
      notes: data.notes ?? null,
      contacted_at: data.contacted_at ? new Date(data.contacted_at) : new Date(),
      contacted_by: data.contacted_by,
    });
    const saved = await this.logRepo.save(log);

    // Auto-advance status: PENDING → IN_PROGRESS on first contact
    if (fu.status === FollowUpStatus.PENDING) {
      fu.status = FollowUpStatus.IN_PROGRESS;
      await this.repo.save(fu);
    }
    return saved;
  }

  async getContactLogs(followUpId: string): Promise<FollowUpContactLog[]> {
    return this.logRepo.find({
      where: { follow_up_id: followUpId },
      relations: ["contactor"],
      order: { contacted_at: "DESC" },
    });
  }

  // ─── Saved filters ────────────────────────────────────────────────────────
  async listSavedFilters(userId: string, branchId: string): Promise<FollowUpSavedFilter[]> {
    return this.savedFilterRepo.find({
      where: { user_id: userId, branch_id: branchId },
      order: { created_at: "DESC" },
    });
  }

  async createSavedFilter(
    userId: string,
    branchId: string,
    name: string,
    filters: Record<string, any>,
  ): Promise<FollowUpSavedFilter> {
    const entity = this.savedFilterRepo.create({
      user_id: userId,
      branch_id: branchId,
      name,
      filters,
    });
    return this.savedFilterRepo.save(entity);
  }

  async deleteSavedFilter(id: string, userId: string): Promise<boolean> {
    const result = await this.savedFilterRepo.delete({ id, user_id: userId });
    return (result.affected ?? 0) > 0;
  }

  // ─── Automation ───────────────────────────────────────────────────────────
  /** Create a follow-up automatically (idempotent on person_id+type when scoped). */
  async autoCreate(data: CreateFollowUpDTO, opts?: { skipIfDuplicate?: boolean }): Promise<FollowUp | null> {
    if (opts?.skipIfDuplicate && (data.person_id || data.user_id)) {
      const where: any = {
        branch_id: data.branch_id,
        type: data.type ?? FollowUpType.GENERAL,
        status: In([FollowUpStatus.PENDING, FollowUpStatus.IN_PROGRESS]),
      };
      if (data.person_id) where.person_id = data.person_id;
      if (data.user_id) where.user_id = data.user_id;
      const existing = await this.repo.findOne({ where });
      if (existing) return null;
    }
    return this.create(data);
  }

  /** Bump priority on overdue follow-ups that have been pending too long. */
  async escalateOverdue(daysOverdue = 3): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(FollowUp)
      .set({ priority: FollowUpPriority.URGENT, is_escalated: true })
      .where("status IN (:...openStatuses)", {
        openStatuses: [FollowUpStatus.PENDING, FollowUpStatus.IN_PROGRESS],
      })
      .andWhere("is_escalated = false")
      .andWhere("priority != :urgent", { urgent: FollowUpPriority.URGENT })
      .andWhere("scheduled_date IS NOT NULL")
      .andWhere(`scheduled_date < (CURRENT_DATE - INTERVAL '${daysOverdue} days')`)
      .execute();
    return result.affected ?? 0;
  }

  /** Notify admins + assignee once when an open follow-up is 7+ days overdue. */
  async notifySevenDayOverdue(): Promise<number> {
    const rows = await this.repo
      .createQueryBuilder("f")
      .leftJoinAndSelect("f.person", "person")
      .leftJoinAndSelect("f.user", "user")
      .leftJoinAndSelect("f.assignee", "assignee")
      .where("f.status IN (:...openStatuses)", {
        openStatuses: [FollowUpStatus.PENDING, FollowUpStatus.IN_PROGRESS],
      })
      .andWhere("f.scheduled_date IS NOT NULL")
      .andWhere("f.scheduled_date <= CURRENT_DATE - INTERVAL '7 days'")
      .getMany();

    let notified = 0;
    for (const followUp of rows) {
      const targetName = this.followUpTargetName(followUp);
      const sentForDate = followUp.scheduled_date || this.todayIso();
      const title = "Follow-up is overdue";
      const message = `The follow-up for ${targetName} is more than 7 days past its scheduled date.`;

      const recipients = new Map<string, User>();
      if (followUp.assignee) recipients.set(followUp.assignee.id, followUp.assignee);
      for (const admin of await this.getBranchAdmins(followUp.branch_id)) recipients.set(admin.id, admin);

      for (const recipient of recipients.values()) {
        await this.notifyInApp(followUp, recipient.id, FollowUpNotificationType.OVERDUE_7D, title, message, sentForDate);
        await this.notifyEmail(followUp, recipient, FollowUpNotificationType.OVERDUE_7D, title, message, sentForDate);
        notified++;
      }
    }

    return notified;
  }

  /** Send daily reminders for high-priority follow-ups from scheduled date onward. */
  async notifyHighPriorityDaily(): Promise<number> {
    const rows = await this.repo
      .createQueryBuilder("f")
      .leftJoinAndSelect("f.person", "person")
      .leftJoinAndSelect("f.user", "user")
      .leftJoinAndSelect("f.assignee", "assignee")
      .where("f.status IN (:...openStatuses)", {
        openStatuses: [FollowUpStatus.PENDING, FollowUpStatus.IN_PROGRESS],
      })
      .andWhere("f.priority = :priority", { priority: FollowUpPriority.HIGH })
      .andWhere("f.assigned_to IS NOT NULL")
      .andWhere("f.scheduled_date IS NOT NULL")
      .andWhere("f.scheduled_date <= CURRENT_DATE")
      .getMany();

    let notified = 0;
    for (const followUp of rows) {
      if (!followUp.assignee) continue;
      const targetName = this.followUpTargetName(followUp);
      const title = "High-priority follow-up reminder";
      const message = `Please follow up with ${targetName}. This high-priority follow-up is scheduled and still open.`;
      await this.notifyInApp(followUp, followUp.assignee.id, FollowUpNotificationType.HIGH_PRIORITY_DAILY, title, message);
      await this.notifyEmail(followUp, followUp.assignee, FollowUpNotificationType.HIGH_PRIORITY_DAILY, title, message);
      notified++;
    }

    return notified;
  }

  /** Detect members who missed every church service on a service day in the last week. */
  async detectAbsenteesForBranch(branchId: string, weeks = 1): Promise<number> {
    const rows: { user_id: string; missed_date: string }[] = await AppDataSource.query(
      `
      WITH service_days AS (
        SELECT DISTINCT e.date
        FROM events e
        WHERE e.branch_id = $1
          AND e.category = $2
          AND e.date >= CURRENT_DATE - ($3::int * INTERVAL '1 week')
          AND e.date < CURRENT_DATE
          AND e.status IN ($4, $5, $6)
      )
      SELECT bm.user_id, sd.date AS missed_date
      FROM branch_memberships bm
      CROSS JOIN service_days sd
      WHERE bm.branch_id = $1
        AND bm.is_active = true
        AND bm.role = 'member'
        AND NOT EXISTS (
          SELECT 1
          FROM event_attendance ea
          INNER JOIN events attended_event ON attended_event.id = ea.event_id
          WHERE ea.user_id = bm.user_id
            AND attended_event.branch_id = bm.branch_id
            AND attended_event.category = $2
            AND ea.event_date = sd.date
        )
        AND NOT EXISTS (
          SELECT 1
          FROM follow_ups f
          WHERE f.user_id = bm.user_id
            AND f.branch_id = bm.branch_id
            AND f.type = 'absent_member'
            AND f.scheduled_date = sd.date
            AND f.status IN ('pending','in_progress')
        )
      `,
      [branchId, EventCategory.CHURCH_SERVICE, weeks, EventStatus.PUBLISHED, EventStatus.ONGOING, EventStatus.CLOSED],
    );

    let created = 0;
    for (const row of rows) {
      await this.create({
        branch_id: branchId,
        user_id: row.user_id,
        type: FollowUpType.ABSENT_MEMBER,
        priority: FollowUpPriority.MEDIUM,
        scheduled_date: row.missed_date,
        notes: `Auto-flagged: missed church service on ${row.missed_date}.`,
      });
      created++;
    }
    return created;
  }

  /** Detect members with birthdays today and create birthday follow-ups. */
  async detectBirthdaysForBranch(branchId: string): Promise<number> {
    const rows: { user_id: string }[] = await AppDataSource.query(
      `
      SELECT bm.user_id
      FROM branch_memberships bm
      INNER JOIN users u ON u.id = bm.user_id
      WHERE bm.branch_id = $1
        AND bm.is_active = true
        AND u.dob IS NOT NULL
        AND EXTRACT(MONTH FROM u.dob) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM u.dob) = EXTRACT(DAY FROM CURRENT_DATE)
        AND NOT EXISTS (
          SELECT 1 FROM follow_ups f
          WHERE f.user_id = bm.user_id
            AND f.branch_id = bm.branch_id
            AND f.type = 'birthday'
            AND f.created_at::date = CURRENT_DATE
        )
      `,
      [branchId],
    );

    for (const row of rows) {
      await this.create({
        branch_id: branchId,
        user_id: row.user_id,
        type: FollowUpType.BIRTHDAY,
        priority: FollowUpPriority.LOW,
        scheduled_date: new Date().toISOString().slice(0, 10),
        notes: "Birthday today — send greetings.",
      });
    }
    return rows.length;
  }
}
