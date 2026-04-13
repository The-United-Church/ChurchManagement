import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Branch } from "../church/branch.model";
import { User } from "../user.model";

export enum EventCategory {
  CHURCH_SERVICE = "church_service",
  MIDWEEK_SERVICE = "midweek_service",
  YOUTH = "youth",
  WOMEN = "women",
  MEN = "men",
  CHILDREN = "children",
  REVIVAL = "revival",
  GENERAL = "general",
}

export enum RecurrencePattern {
  DAILY = "daily",
  WEEKLY = "weekly",
  EVERY_2_WEEKS = "every_2_weeks",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

export enum MonthlyRecurrenceType {
  DAY_OF_MONTH = "day_of_month",
  DAY_OF_WEEK = "day_of_week",
}

export enum EventVisibility {
  PUBLIC = "public",
  MEMBERS = "members",
}

export enum EventStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  CANCELLED = "cancelled",
  CLOSED = "closed",
}

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  location: string;

  @Column({ type: "enum", enum: EventCategory })
  category: EventCategory;

  @Column({ type: "date" })
  date: string;

  @Column({ type: "time" })
  time_from: string;

  @Column({ type: "time" })
  time_to: string;

  @Column({ nullable: true })
  image: string;

  // ── Recurrence ────────────────────────────────────────────────
  @Column({ default: false })
  is_recurring: boolean;

  @Column({ type: "enum", enum: RecurrencePattern, nullable: true })
  recurrence_pattern: RecurrencePattern | null;

  /** e.g. [0,2] for Sunday & Tuesday (0=Sun … 6=Sat) */
  @Column({ type: "jsonb", nullable: true })
  recurrence_days: number[] | null;

  /** For monthly: "day_of_month" or "day_of_week" */
  @Column({ type: "enum", enum: MonthlyRecurrenceType, nullable: true })
  monthly_type: MonthlyRecurrenceType | null;

  /** Day-of-month (1–31) when monthly_type = day_of_month */
  @Column({ type: "int", nullable: true })
  monthly_day: number | null;

  /** e.g. "first_sunday" when monthly_type = day_of_week */
  @Column({ type: "varchar", nullable: true })
  monthly_week_descriptor: string | null;

  @Column({ type: "date", nullable: true })
  recurrence_end_date: string | null;

  // ── Attendance ────────────────────────────────────────────────
  @Column({ default: false })
  accept_attendance: boolean;

  @Column({ default: false })
  require_location: boolean;

  @Column({ type: "float", nullable: true })
  location_lat: number | null;

  @Column({ type: "float", nullable: true })
  location_lng: number | null;

  /** Radius in meters within which a check-in is valid */
  @Column({ type: "int", nullable: true })
  location_radius: number | null;

  /**
   * "open"      – immediately open (manual override)
   * "closed"    – closed (manual override)
   * "scheduled" – open only within attendance_opens_at … attendance_closes_at on the event day
   *  null        – always open whenever accept_attendance is true
   */
  @Column({ type: "varchar", length: 20, nullable: true })
  attendance_status: "open" | "closed" | "scheduled" | null;

  /** ISO datetime – when attendance opens (used when attendance_status = "scheduled") */
  @Column({ type: "timestamp with time zone", nullable: true })
  attendance_opens_at: Date | null;

  /** ISO datetime – when attendance closes (used when attendance_status = "scheduled") */
  @Column({ type: "timestamp with time zone", nullable: true })
  attendance_closes_at: Date | null;

  // ── Visibility / Publishing ───────────────────────────────────
  @Column({ type: "enum", enum: EventVisibility, default: EventVisibility.PUBLIC })
  visibility: EventVisibility;

  @Column({ type: "jsonb", nullable: true })
  visible_to_member_ids: string[] | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  publish_at: Date | null;

  @Column({ default: false })
  is_published: boolean;

  @Column({ type: "enum", enum: EventStatus, default: EventStatus.DRAFT })
  status: EventStatus;

  // ── Relations ─────────────────────────────────────────────────
  @Column()
  branch_id: string;

  @ManyToOne(() => Branch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "branch_id" })
  branch: Branch;

  @Column()
  created_by: string;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by" })
  creator: User;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;
}
