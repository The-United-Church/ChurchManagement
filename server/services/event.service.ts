import { Repository, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { AppDataSource } from "../config/database";
import { Event, EventVisibility, EventStatus } from "../models/event";
import { EventAttendance } from "../models/event/event-attendance.model";
import { BranchMembership, BranchRole } from "../models/church";
import CustomError from "../utils/customError";

export interface CreateEventDTO {
  title: string;
  description?: string;
  location: string;
  category: string;
  date: string;
  time_from: string;
  time_to: string;
  image?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  recurrence_days?: number[];
  monthly_type?: string;
  monthly_day?: number;
  monthly_week_descriptor?: string;
  recurrence_end_date?: string;
  accept_attendance?: boolean;
  require_location?: boolean;
  location_lat?: number;
  location_lng?: number;
  location_radius?: number;
  visibility?: string;
  visible_to_member_ids?: string[];
  publish_at?: string;
  status?: EventStatus;
  branch_id: string;
  created_by: string;
}

export interface EventFilters {
  branch_id: string;
  page?: number;
  limit?: number;
  category?: string;
  from_date?: string;
  to_date?: string;
  user_id?: string;
  include_unpublished?: boolean;
}

export class EventService {
  private readonly eventRepo: Repository<Event>;
  private readonly attendanceRepo: Repository<EventAttendance>;
  private readonly membershipRepo: Repository<BranchMembership>;

  constructor() {
    this.eventRepo = AppDataSource.getRepository(Event);
    this.attendanceRepo = AppDataSource.getRepository(EventAttendance);
    this.membershipRepo = AppDataSource.getRepository(BranchMembership);
  }

  async create(data: CreateEventDTO): Promise<Event> {
    const requestedStatus = data.status ?? EventStatus.DRAFT;
    const isPublishedNow =
      requestedStatus === EventStatus.PUBLISHED &&
      (!data.publish_at || new Date(data.publish_at) <= new Date());
    const event = this.eventRepo.create({
      ...data,
      status: requestedStatus,
      is_published: isPublishedNow,
      publish_at: data.publish_at ? new Date(data.publish_at) : null,
    } as Partial<Event>);
    return this.eventRepo.save(event);
  }

  async findById(id: string): Promise<Event | null> {
    return this.eventRepo.findOne({
      where: { id },
      relations: ["branch", "creator"],
    });
  }

  async findByBranch(filters: EventFilters): Promise<{ events: Event[]; total: number }> {
    const { branch_id, page = 1, limit = 25, category, from_date, to_date, include_unpublished } = filters;
    const qb = this.eventRepo
      .createQueryBuilder("e")
      .leftJoinAndSelect("e.creator", "creator")
      .where("e.branch_id = :branch_id", { branch_id })
      .orderBy("e.date", "DESC")
      .addOrderBy("e.time_from", "ASC");

    if (!include_unpublished) {
      qb.andWhere("e.status = :published", { published: EventStatus.PUBLISHED });
      qb.andWhere("(e.is_published = true OR e.publish_at <= NOW())");
    }
    if (category) {
      qb.andWhere("e.category = :category", { category });
    }
    if (from_date) {
      qb.andWhere("e.date >= :from_date", { from_date });
    }
    if (to_date) {
      qb.andWhere("e.date <= :to_date", { to_date });
    }

    const [events, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { events, total };
  }

  async update(id: string, data: Partial<CreateEventDTO>): Promise<Event> {
    const event = await this.eventRepo.findOneBy({ id });
    if (!event) throw new CustomError("Event not found", 404);

    if (data.publish_at) {
      (data as any).is_published = new Date(data.publish_at) <= new Date();
      (data as any).publish_at = new Date(data.publish_at);
    }
    // Sync is_published with status changes
    if (data.status === EventStatus.PUBLISHED && !event.is_published) {
      (data as any).is_published = !event.publish_at || new Date(event.publish_at) <= new Date();
    }
    if (data.status && data.status !== EventStatus.PUBLISHED) {
      (data as any).is_published = false;
    }

    Object.assign(event, data);
    return this.eventRepo.save(event);
  }

  async remove(id: string): Promise<void> {
    const event = await this.eventRepo.findOneBy({ id });
    if (!event) throw new CustomError("Event not found", 404);
    await this.eventRepo.remove(event);
  }

  async canManageEvent(userId: string, branchId: string): Promise<boolean> {
    const membership = await this.membershipRepo.findOne({
      where: { user_id: userId, branch_id: branchId, is_active: true },
    });
    if (!membership) return false;
    return [BranchRole.ADMIN, BranchRole.COORDINATOR].includes(membership.role);
  }

  async getVisibleEvents(filters: EventFilters): Promise<{ events: Event[]; total: number }> {
    const { branch_id, user_id, page = 1, limit = 25, category, from_date, to_date } = filters;
    const qb = this.eventRepo
      .createQueryBuilder("e")
      .leftJoinAndSelect("e.creator", "creator")
      .where("e.branch_id = :branch_id", { branch_id })
      .andWhere("e.status = :published", { published: EventStatus.PUBLISHED })
      .andWhere("(e.is_published = true OR e.publish_at <= NOW())")
      .orderBy("e.date", "ASC")
      .addOrderBy("e.time_from", "ASC");

    if (user_id) {
      qb.andWhere(
        `(e.visibility = :pub OR (e.visibility = :mem) OR (e.visible_to_member_ids IS NOT NULL AND e.visible_to_member_ids ::jsonb @> :uid))`,
        { pub: EventVisibility.PUBLIC, mem: EventVisibility.MEMBERS, uid: JSON.stringify([user_id]) },
      );
    } else {
      qb.andWhere("e.visibility = :pub", { pub: EventVisibility.PUBLIC });
    }

    if (category) qb.andWhere("e.category = :category", { category });
    if (from_date) qb.andWhere("e.date >= :from_date", { from_date });
    if (to_date) qb.andWhere("e.date <= :to_date", { to_date });

    const [events, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { events, total };
  }

  /** Publish events whose publish_at has passed (called periodically or on demand) */
  async publishDueEvents(): Promise<number> {
    const result = await this.eventRepo
      .createQueryBuilder()
      .update(Event)
      .set({ is_published: true })
      .where("is_published = false AND publish_at <= NOW() AND status = :s", { s: EventStatus.PUBLISHED })
      .execute();
    return result.affected ?? 0;
  }
}
