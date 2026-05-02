import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import { WebsiteVisitService } from "../services/website-visit.service";
import type { WebsiteVisitPageType } from "../models/website-visit.model";

const websiteVisitService = new WebsiteVisitService();

export const recordWebsiteVisit = asyncHandler(async (req: Request, res: Response) => {
  const { domain, path, pageType, visitorId } = req.body as {
    domain?: string;
    path?: string;
    pageType?: WebsiteVisitPageType;
    visitorId?: string;
  };

  if (!domain || !pageType || !["main_landing", "custom_domain_landing"].includes(pageType)) {
    res.status(400).json({ status: 400, message: "domain and valid pageType are required" });
    return;
  }

  await websiteVisitService.recordVisit({
    domain,
    path,
    pageType,
    visitorId,
    ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString().split(",")[0] || null,
    userAgent: req.headers["user-agent"] || null,
    referrer: req.headers.referer || req.headers.referrer?.toString() || null,
  });

  res.status(201).json({ status: 201, message: "Visit recorded" });
});

export const getWebsiteVisitStats = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(365, Math.max(1, parseInt(String(req.query.days || "30"), 10)));
  const stats = await websiteVisitService.getStats(days);
  res.status(200).json({ data: stats, status: 200, message: "Website visit stats fetched" });
});
