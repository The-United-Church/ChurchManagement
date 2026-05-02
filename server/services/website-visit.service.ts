import { MoreThanOrEqual } from "typeorm";
import { AppDataSource } from "../config/database";
import { WebsiteVisit, WebsiteVisitPageType } from "../models/website-visit.model";

export interface RecordWebsiteVisitInput {
  domain: string;
  path?: string;
  pageType: WebsiteVisitPageType;
  visitorId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
}

export class WebsiteVisitService {
  private readonly visitRepository = AppDataSource.getRepository(WebsiteVisit);

  async recordVisit(input: RecordWebsiteVisitInput): Promise<WebsiteVisit> {
    const visit = this.visitRepository.create({
      domain: input.domain.toLowerCase(),
      path: input.path || "/",
      page_type: input.pageType,
      visitor_id: input.visitorId || null,
      ip_address: input.ipAddress || null,
      user_agent: input.userAgent || null,
      referrer: input.referrer || null,
    });
    return this.visitRepository.save(visit);
  }

  async getStats(days = 30): Promise<{
    totalVisits: number;
    todayVisits: number;
    mainLandingVisits: number;
    customDomainVisits: number;
    uniqueVisitors: number;
    lastVisitAt: string | null;
    lastVisitDomain: string | null;
    topDomains: { domain: string; count: number }[];
    daily: { date: string; count: number }[];
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalVisits, todayVisits, mainLandingVisits, customDomainVisits] = await Promise.all([
      this.visitRepository.count({ where: { created_at: MoreThanOrEqual(since) } }),
      this.visitRepository.count({ where: { created_at: MoreThanOrEqual(today) } }),
      this.visitRepository.count({ where: { page_type: "main_landing", created_at: MoreThanOrEqual(since) } }),
      this.visitRepository.count({ where: { page_type: "custom_domain_landing", created_at: MoreThanOrEqual(since) } }),
    ]);

    const uniqueRaw = await this.visitRepository
      .createQueryBuilder("visit")
      .select("COUNT(DISTINCT COALESCE(visit.visitor_id, visit.ip_address, CAST(visit.id AS varchar)))", "count")
      .where("visit.created_at >= :since", { since })
      .getRawOne();

    const topDomains = await this.visitRepository
      .createQueryBuilder("visit")
      .select("visit.domain", "domain")
      .addSelect("COUNT(*)", "count")
      .where("visit.created_at >= :since", { since })
      .groupBy("visit.domain")
      .orderBy("count", "DESC")
      .limit(5)
      .getRawMany();

    const dailyRaw = await this.visitRepository
      .createQueryBuilder("visit")
      .select("TO_CHAR(visit.created_at::date, 'YYYY-MM-DD')", "date")
      .addSelect("COUNT(*)", "count")
      .where("visit.created_at >= :since", { since })
      .groupBy("visit.created_at::date")
      .orderBy("visit.created_at::date", "ASC")
      .getRawMany();

    const lastVisit = await this.visitRepository
      .createQueryBuilder("visit")
      .orderBy("visit.created_at", "DESC")
      .getOne();

    return {
      totalVisits,
      todayVisits,
      mainLandingVisits,
      customDomainVisits,
      uniqueVisitors: Number(uniqueRaw?.count || 0),
      lastVisitAt: lastVisit?.created_at?.toISOString() ?? null,
      lastVisitDomain: lastVisit?.domain ?? null,
      topDomains: topDomains.map((row) => ({ domain: row.domain, count: Number(row.count) })),
      daily: dailyRaw.map((row) => ({ date: row.date, count: Number(row.count) })),
    };
  }
}
