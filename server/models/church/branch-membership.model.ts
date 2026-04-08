import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { Branch } from "./branch.model";

/**
 * Levels of authority within a branch (lowest → highest):
 *   member → coordinator → admin
 */
export enum BranchRole {
  MEMBER      = "member",      // default — regular participant
  COORDINATOR = "coordinator", // mid-level; assists with management
  ADMIN       = "admin",       // branch head; assigned to the creator
}

/**
 * Tracks a user's membership in a specific branch, including their role.
 * A user may belong to many branches and hold a different role in each.
 */
@Entity("branch_memberships")
@Unique(["user_id", "branch_id"])
export class BranchMembership {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  user_id: string;

  @Column()
  branch_id: string;

  @Column({
    type: "enum",
    enum: BranchRole,
    default: BranchRole.MEMBER,
  })
  role: BranchRole;

  @ManyToOne("User", "branchMemberships", { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: any;

  @ManyToOne(() => Branch, (b) => b.memberships, { onDelete: "CASCADE" })
  @JoinColumn({ name: "branch_id" })
  branch: Branch;

  @CreateDateColumn()
  joined_at: Date;
}
