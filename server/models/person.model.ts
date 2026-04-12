import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Branch } from "./church/branch.model";

export enum PersonGender {
  MALE = "male",
  FEMALE = "female",
}

@Entity("people")
export class Person {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ nullable: true })
  middle_name: string;

  @Column({ nullable: true })
  nickname: string;

  @Column({ type: "date", nullable: true })
  birthdate: Date;

  @Column({ type: "enum", enum: PersonGender, nullable: true })
  gender: PersonGender;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  profile_image: string;

  @Column({ nullable: true })
  branch_id: string;

  @ManyToOne(() => Branch, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "branch_id" })
  branch: Branch;

  /** Tracks whether this person has been converted to a User (member) */
  @Column({ nullable: true })
  converted_user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
