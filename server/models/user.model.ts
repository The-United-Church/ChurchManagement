import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinTable,
  JoinColumn,
} from "typeorm";
import * as bcrypt from "bcrypt";
import { Exclude } from "class-transformer";
import { Gender, UserSettings } from "../types/user";
import { Denomination } from "./church/denomination.model";
import { BranchMembership } from "./church/branch-membership.model";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ nullable: true })
  middle_name: string;

  @Column({ nullable: true })
  nick_name: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  full_name: string;

  @Column({ nullable: true })
  address_line: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  postal_code: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  phone_number: string;

  @Column({ type: "date", nullable: true })
  dob: Date;

  @Column({ nullable: true })
  job_title: string;

  @Column({ nullable: true })
  employer: string;

  @Column({ nullable: true })
  facebook_link: string;

  @Column({ type: "boolean", default: true })
  is_display_email: boolean;

  @Column({ type: "boolean", default: false })
  is_accept_text: boolean;

  @Column({
    type: "enum",
    enum: ["single", "married", "widowed", "engaged", "divorced", "separated"],
    nullable: true,
  })
  marital_status: "single" | "married" | "widowed" | "engaged" | "divorced" | "separated";

  @Column({ type: "date", nullable: true })
  date_married: Date;

  @Column({ type: "boolean", default: false, nullable: true })
  phone_is_whatsapp: boolean;

  @Column({ nullable: true })
  grade: string;

  @Column({ type: "date", nullable: true })
  baptism_date: Date;

  @Column({ nullable: true })
  baptism_location: string;

  @Column({
    type: "enum",
    enum: ["member", "attender", "visitor"],
    default: "visitor",
  })
  member_status: "member" | "attender" | "visitor";

  @Column("json", { nullable: true })
  family_members: any[];

  @Column({ type: "timestamp", nullable: true })
  last_access: Date;

  @Column({ nullable: true })
  reset_password_token: string;

  @Column({ nullable: true })
  reset_password_expires: Date;

  @Exclude()
  @Column({ nullable: true })
  password_hash: string;

  @Column({ nullable: true, default: 'member' })
  role: string;

  /** Denominations (churches) this user is a member of */
  @ManyToMany(() => Denomination, (d) => d.members)
  @JoinTable({
    name: "user_denominations",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "denomination_id", referencedColumnName: "id" },
  })
  denominations: Denomination[];

  /** Branch memberships — each entry records the branch and the user's role in it */
  @OneToMany(() => BranchMembership, (m) => m.user)
  branchMemberships: BranchMembership[];

  @Column({
    type: "boolean",
    default: true,
  })
  is_active: boolean;

  @Column({
    type: "enum",
    enum: Gender,
    nullable: true,
  })
  gender: Gender;

  @Column({ nullable: true })
  profile_img: string;

  @Column("json", { nullable: true })
  settings: UserSettings;

  @Column({ type: "varchar", nullable: true })
  two_factor_code: string | null;

  @Column({ type: "timestamp", nullable: true })
  two_factor_code_expires_at?: Date | null;

  @Column({ nullable: true })
  otp_secret: string;

  @Column({ nullable: true })
  otp_hash: string;

  @Column({ nullable: true, unique: true })
  google_id: string;

  @Exclude()
  @Column({ nullable: true })
  refresh_token_hash: string;

  @CreateDateColumn({type: "timestamp"})
  createdAt: Date;

  @UpdateDateColumn({type: "timestamp"})
  updatedAt: Date;
  user: any;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    try {
      if (
        this.password_hash &&
        !this.password_hash.startsWith("$2b$") &&
        !this.password_hash.startsWith("$2a$")
      ) {
        const salt = await bcrypt.genSalt(10);
        this.password_hash = await bcrypt.hash(this.password_hash, salt);
      }
    } catch (error) {
      console.error("Error hashing password:", error);
      throw new Error("Password hashing failed");
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    try {
      if (!this.password_hash) return false;
      return await bcrypt.compare(password, this.password_hash);
    } catch (error) {
      console.error("Password validation error:", error);
      return false;
    }
  }
}
