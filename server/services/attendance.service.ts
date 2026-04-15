import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { EventAttendance } from "../models/event/event-attendance.model";
import { GuestAttendance } from "../models/event/guest-attendance.model";
import { Event } from "../models/event/event.model";
import { BranchMembership, BranchRole } from "../models/church";
import CustomError from "../utils/customError";

export interface MarkAttendanceDTO {
  event_id: string;
  event_date: string;
  user_id: string;
  marked_by?: string;
  check_in_lat?: number;
  check_in_lng?: number;
}

export interface GuestAttendanceDTO {
  event_id: string;
  event_date: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  country?: string;
  state?: string;
  address?: string;
  comments?: string;
  custom_responses?: Record<string, string>;
  check_in_lat?: number;
  check_in_lng?: number;
}

export class AttendanceService {
  private readonly attendanceRepo: Repository<EventAttendance>;
  private readonly guestRepo: Repository<GuestAttendance>;
  private readonly eventRepo: Repository<Event>;
  private readonly membershipRepo: Repository<BranchMembership>;

  constructor() {
    this.attendanceRepo = AppDataSource.getRepository(EventAttendance);
    this.guestRepo = AppDataSource.getRepository(GuestAttendance);
    this.eventRepo = AppDataSource.getRepository(Event);
    this.membershipRepo = AppDataSource.getRepository(BranchMembership);
  }

  async markAttendance(dto: MarkAttendanceDTO): Promise<EventAttendance> {
    const event = await this.eventRepo.findOneBy({ id: dto.event_id });
    if (!event) throw new CustomError("Event not found", 404);
    if (!event.accept_attendance) throw new CustomError("This event does not accept attendance", 400);

    // ── Attendance window ───────────────────────────────────────
    if (event.attendance_status === "closed") {
      throw new CustomError("Attendance is currently closed for this event", 400);
    }
    if (event.attendance_status === "scheduled") {
      const now = new Date();
      const opens = event.attendance_opens_at ? new Date(event.attendance_opens_at) : null;
      const closes = event.attendance_closes_at ? new Date(event.attendance_closes_at) : null;
      if (opens !== null && now < opens) {
        throw new CustomError(`Attendance opens at ${opens.toLocaleString()}`, 400);
      }
      if (closes !== null && now > closes) {
        throw new CustomError(`Attendance has closed (window ended at ${closes.toLocaleString()})`, 400);
      }
    }
    // "open" or null → always allow

    const isSelfCheckIn = !dto.marked_by || dto.marked_by === dto.user_id;
    if (isSelfCheckIn && event.require_location) {
      this.validateLocation(event, dto.check_in_lat, dto.check_in_lng);
    }

    const existing = await this.attendanceRepo.findOne({
      where: { event_id: dto.event_id, event_date: dto.event_date, user_id: dto.user_id },
    });
    if (existing) throw new CustomError("Attendance already marked for this event date", 409);

    const record = this.attendanceRepo.create(dto);
    return this.attendanceRepo.save(record);
  }

  async removeAttendance(eventId: string, eventDate: string, userId: string): Promise<void> {
    const record = await this.attendanceRepo.findOne({
      where: { event_id: eventId, event_date: eventDate, user_id: userId },
    });
    if (!record) throw new CustomError("Attendance record not found", 404);
    await this.attendanceRepo.remove(record);
  }

  async getEventAttendance(eventId: string, eventDate: string): Promise<EventAttendance[]> {
    return this.attendanceRepo.find({
      where: { event_id: eventId, event_date: eventDate },
      relations: ["user"],
      order: { checked_in_at: "ASC" },
    });
  }

  async getAttendanceSummary(eventId: string): Promise<{ date: string; count: number }[]> {
    const rows = await this.attendanceRepo
      .createQueryBuilder("a")
      .select("a.event_date", "date")
      .addSelect("COUNT(*)::int", "count")
      .where("a.event_id = :eventId", { eventId })
      .groupBy("a.event_date")
      .orderBy("a.event_date", "DESC")
      .getRawMany();
    return rows;
  }

  async isAdminOrCoordinator(userId: string, branchId: string): Promise<boolean> {
    const m = await this.membershipRepo.findOne({
      where: { user_id: userId, branch_id: branchId, is_active: true },
    });
    return !!m && [BranchRole.ADMIN, BranchRole.COORDINATOR].includes(m.role);
  }

  private validateLocation(event: Event, lat?: number, lng?: number): void {
    if (lat == null || lng == null) {
      throw new CustomError("Location is required for attendance at this event", 400);
    }
    if (event.location_lat == null || event.location_lng == null || event.location_radius == null) {
      return; // event has no geofence configured
    }
    const distance = this.haversineMeters(event.location_lat, event.location_lng, lat, lng);
    if (distance > event.location_radius) {
      throw new CustomError(
        `You must be within ${event.location_radius}m of the event location to check in (you are ${Math.round(distance)}m away)`,
        403,
      );
    }
  }

  private haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6_371_000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── Guest attendance (QR code check-in) ───────────────────────

  async getPublicEventInfo(eventId: string): Promise<{ id: string; title: string; date: string; time_from: string; time_to: string; location: string; accept_attendance: boolean; require_location: boolean; attendance_status: string | null; attendance_opens_at: Date | null; attendance_closes_at: Date | null; guest_checkin_fields: any[] | null; allow_multiple_checkins: boolean } | null> {
    const event = await this.eventRepo.findOneBy({ id: eventId });
    if (!event) return null;
    return {
      id: event.id,
      title: event.title,
      date: event.date,
      time_from: event.time_from,
      time_to: event.time_to,
      location: event.location,
      accept_attendance: event.accept_attendance,
      require_location: event.require_location,
      attendance_status: event.attendance_status,
      attendance_opens_at: event.attendance_opens_at,
      attendance_closes_at: event.attendance_closes_at,
      guest_checkin_fields: event.guest_checkin_fields,
      allow_multiple_checkins: event.allow_multiple_checkins,
    };
  }

  async markGuestAttendance(dto: GuestAttendanceDTO): Promise<GuestAttendance> {
    const event = await this.eventRepo.findOneBy({ id: dto.event_id });
    if (!event) throw new CustomError("Event not found", 404);
    if (!event.accept_attendance) throw new CustomError("This event does not accept attendance", 400);

    // ── Attendance window ───────────────────────────────────────
    if (event.attendance_status === "closed") {
      throw new CustomError("Attendance is currently closed for this event", 400);
    }
    if (event.attendance_status === "scheduled") {
      const now = new Date();
      const opens = event.attendance_opens_at ? new Date(event.attendance_opens_at) : null;
      const closes = event.attendance_closes_at ? new Date(event.attendance_closes_at) : null;
      if (opens !== null && now < opens) {
        throw new CustomError(`Attendance opens at ${opens.toLocaleString()}`, 400);
      }
      if (closes !== null && now > closes) {
        throw new CustomError(`Attendance has closed (window ended at ${closes.toLocaleString()})`, 400);
      }
    }

    if (event.require_location) {
      this.validateLocation(event, dto.check_in_lat, dto.check_in_lng);
    }

    const record = this.guestRepo.create(dto);
    return this.guestRepo.save(record);
  }

  async getGuestAttendance(eventId: string, eventDate: string): Promise<GuestAttendance[]> {
    return this.guestRepo.find({
      where: { event_id: eventId, event_date: eventDate },
      order: { checked_in_at: "ASC" },
    });
  }
}
