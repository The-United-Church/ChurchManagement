import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { Event } from "./event.model";
import { User } from "../user.model";

@Entity("event_attendance")
@Unique(["event_id", "event_date", "user_id"])
export class EventAttendance {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  event_id: string;

  @ManyToOne(() => Event, { onDelete: "CASCADE" })
  @JoinColumn({ name: "event_id" })
  event: Event;

  /** The specific occurrence date the attendance is for */
  @Column({ type: "date" })
  event_date: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  /** Who marked the attendance: the user themselves or an admin on their behalf */
  @Column({ nullable: true })
  marked_by: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "marked_by" })
  marker: User;

  @Column({ type: "float", nullable: true })
  check_in_lat: number | null;

  @Column({ type: "float", nullable: true })
  check_in_lng: number | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  checked_in_at: Date;
}
