import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export type WebsiteVisitPageType = "main_landing" | "custom_domain_landing";

@Entity("website_visits")
export class WebsiteVisit {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "varchar", length: 255 })
  domain: string;

  @Column({ type: "varchar", length: 500, default: "/" })
  path: string;

  @Index()
  @Column({ type: "varchar", length: 40 })
  page_type: WebsiteVisitPageType;

  @Column({ type: "varchar", length: 80, nullable: true })
  visitor_id: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  ip_address: string | null;

  @Column({ type: "text", nullable: true })
  user_agent: string | null;

  @Column({ type: "text", nullable: true })
  referrer: string | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at: Date;
}
