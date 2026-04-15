import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Event } from "./event.model";

@Entity("guest_attendance")
export class GuestAttendance {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  event_id: string;

  @ManyToOne(() => Event, { onDelete: "CASCADE" })
  @JoinColumn({ name: "event_id" })
  event: Event;

  @Column({ type: "date" })
  event_date: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ type: "varchar", nullable: true })
  email: string | null;

  @Column({ type: "varchar", nullable: true })
  phone: string | null;

  @Column({ type: "varchar", nullable: true })
  country: string | null;

  @Column({ type: "varchar", nullable: true })
  state: string | null;

  @Column({ type: "varchar", nullable: true })
  address: string | null;

  @Column({ type: "text", nullable: true })
  comments: string | null;

  /** Responses to custom check-in fields (key = field id, value = response) */
  @Column({ type: "jsonb", nullable: true })
  custom_responses: Record<string, string> | null;

  @Column({ type: "float", nullable: true })
  check_in_lat: number | null;

  @Column({ type: "float", nullable: true })
  check_in_lng: number | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  checked_in_at: Date;
}
