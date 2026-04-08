import "reflect-metadata";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "../user.model";
import { Branch } from "./branch.model";

/**
 * A Denomination is the top-level church organisation
 * (e.g. "Redeemed Christian Church of God").
 * It owns many Branch locations.
 */
@Entity("denominations")
export class Denomination {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Full official name of the denomination */
  @Column()
  denomination_name: string;

  @Column({ nullable: true })
  description: string;

  /** Headquarters city / general location */
  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  address: string;

  @Column()
  admin_id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "admin_id" })
  admin: User;

  @OneToMany(() => Branch, (branch) => branch.denomination, { cascade: true })
  branches: Branch[];

  /** Users who are members of this denomination */
  @ManyToMany(() => User, (u) => u.denominations)
  members: User[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
