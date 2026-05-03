import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from "typeorm";
import { Branch } from "./church/branch.model";
import { User } from "./user.model";
import { Person } from "./person.model";

export enum FollowUpType {
  FIRST_VISIT = "first_visit",
  ABSENT_MEMBER = "absent_member",
  NEW_CONVERT = "new_convert",
  PRAYER_REQUEST = "prayer_request",
  PASTORAL_CARE = "pastoral_care",
  HOSPITAL_VISIT = "hospital_visit",
  BIRTHDAY = "birthday",
  ANNIVERSARY = "anniversary",
  GENERAL = "general",
}

export enum FollowUpStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum FollowUpPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum ContactMethod {
  PHONE_CALL = "phone_call",
  SMS = "sms",
  WHATSAPP = "whatsapp",
  EMAIL = "email",
  IN_PERSON = "in_person",
  OTHER = "other",
}

export enum ContactOutcome {
  REACHED = "reached",
  NO_ANSWER = "no_answer",
  LEFT_MESSAGE = "left_message",
  SCHEDULED_CALLBACK = "scheduled_callback",
  WRONG_CONTACT = "wrong_contact",
}

export enum FollowUpNotificationType {
  ASSIGNED = "assigned",
  COMPLETED_ADMIN = "completed_admin",
  OVERDUE_7D = "overdue_7d",
  HIGH_PRIORITY_DAILY = "high_priority_daily",
}

export enum FollowUpNotificationChannel {
  IN_APP = "in_app",
  EMAIL = "email",
}

@Entity("follow_ups")
@Index(["branch_id", "status"])
@Index(["assigned_to", "status"])
export class FollowUp {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "enum", enum: FollowUpType, default: FollowUpType.GENERAL })
  type: FollowUpType;

  @Column({ type: "enum", enum: FollowUpStatus, default: FollowUpStatus.PENDING })
  status: FollowUpStatus;

  @Column({ type: "enum", enum: FollowUpPriority, default: FollowUpPriority.MEDIUM })
  priority: FollowUpPriority;

  /** Person being followed up (visitor / non-member). Either person_id or user_id must be set. */
  @Column({ type: "uuid", nullable: true })
  person_id: string | null;

  @ManyToOne(() => Person, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "person_id" })
  person: Person | null;

  /** Member being followed up (registered user). */
  @Column({ type: "uuid", nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "user_id" })
  user: User | null;

  /** Coordinator/staff/member who is assigned to handle this follow-up. */
  @Column({ type: "uuid", nullable: true })
  assigned_to: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "assigned_to" })
  assignee: User | null;

  @Column({ type: "date", nullable: true })
  scheduled_date: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  completed_date: Date | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "text", nullable: true })
  outcome_notes: string | null;

  /** Optional link to the originating event (e.g. first-visit auto-create). */
  @Column({ type: "uuid", nullable: true })
  related_event_id: string | null;

  /** Auto-bumped when SLA expires. */
  @Column({ default: false })
  is_escalated: boolean;

  @Column({ type: "uuid" })
  branch_id: string;

  @ManyToOne(() => Branch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "branch_id" })
  branch: Branch;

  @Column({ type: "uuid", nullable: true })
  created_by: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "created_by" })
  creator: User | null;

  @OneToMany(() => FollowUpContactLog, (log) => log.follow_up)
  contact_logs: FollowUpContactLog[];

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at: Date;
}

@Entity("follow_up_contact_logs")
@Index(["follow_up_id", "contacted_at"])
export class FollowUpContactLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  follow_up_id: string;

  @ManyToOne(() => FollowUp, (f) => f.contact_logs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "follow_up_id" })
  follow_up: FollowUp;

  @Column({ type: "enum", enum: ContactMethod })
  method: ContactMethod;

  @Column({ type: "enum", enum: ContactOutcome })
  outcome: ContactOutcome;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "timestamp with time zone" })
  contacted_at: Date;

  @Column({ type: "uuid" })
  contacted_by: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "contacted_by" })
  contactor: User;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;
}

/** A user-saved filter preset (per-user-per-branch) for the Follow-ups page. */
@Entity("follow_up_saved_filters")
export class FollowUpSavedFilter {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  user_id: string;

  @Column({ type: "uuid" })
  branch_id: string;

  @Column({ type: "text" })
  name: string;

  /** Serialized filter object: { status?, type?, priority?, assignee?, from?, to?, overdueOnly? } */
  @Column({ type: "jsonb" })
  filters: Record<string, any>;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;
}

@Entity("follow_up_notification_logs")
@Index(["follow_up_id", "user_id", "type", "channel", "sent_for_date"], { unique: true })
export class FollowUpNotificationLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  follow_up_id: string;

  @ManyToOne(() => FollowUp, { onDelete: "CASCADE" })
  @JoinColumn({ name: "follow_up_id" })
  follow_up: FollowUp;

  @Column({ type: "uuid" })
  user_id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "enum", enum: FollowUpNotificationType })
  type: FollowUpNotificationType;

  @Column({ type: "enum", enum: FollowUpNotificationChannel })
  channel: FollowUpNotificationChannel;

  @Column({ type: "date" })
  sent_for_date: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;
}
