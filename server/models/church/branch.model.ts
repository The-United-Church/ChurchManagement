import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Denomination } from "./denomination.model";
import { BranchMembership } from "./branch-membership.model";

/**
 * A Branch is a local church (physical location) that belongs to a Denomination.
 */
@Entity("branches")
export class Branch {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  country: string;

  /** Name / contact of the pastor leading this branch */
  @Column({ nullable: true })
  pastor_name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  image: string;

  /** Custom marker icon URL used to represent members on the branch map. */
  @Column({ nullable: true })
  map_marker: string;

  @Column({ default: false })
  is_headquarters: boolean;

  @Column()
  denomination_id: string;

  @ManyToOne(() => Denomination, (d) => d.branches, { onDelete: "CASCADE" })
  @JoinColumn({ name: "denomination_id" })
  denomination: Denomination;

  /** All memberships for this branch (each holds user + role) */
  @OneToMany(() => BranchMembership, (m) => m.branch)
  memberships: BranchMembership[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
