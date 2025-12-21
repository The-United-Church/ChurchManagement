import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.model";

export enum ActivityAction {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  APPROVE = "approve",
  REJECT = "reject",
  LOCK = "lock",
  UNLOCK = "unlock",
  DISPATCH = "dispatch",
  ASSIGN = "assign",
  STATUS_CHANGE = "status_change",
}

export enum EntityType {
  APPROVAL = "approval",
  ASSET = "asset",
  INVENTORY = "inventory",
  WORK_ORDER = "work_order",
  MAINTENANCE_SCHEDULE = "maintenance_schedule",
  USER = "user",
  VEHICLE = "vehicle",
  INSPECTION = "inspection",
  FUEL_LOG = "fuel_log",
  TECHNICIAN = "technician",
  VENDOR = "vendor",
  COST_RECORD = "cost_record",
  VESSEL = "vessel",
  REPORT = "report",
}

@Entity("activity_logs")
export class ActivityLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ nullable: true })
  user_id: string;

  @Column({
    type: "enum",
    enum: ActivityAction,
  })
  action: ActivityAction;

  @Column({
    type: "enum",
    enum: EntityType,
  })
  entityType: EntityType;

  @Column({ nullable: true })
  entityId: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: {
    vesselName?: string;
    crewMemberName?: string;
    reportTitle?: string;
    procurementTitle?: string;
    oldStatus?: string;
    newStatus?: string;
    [key: string]: any;
  };

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;
}

