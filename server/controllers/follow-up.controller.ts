import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import { AuthRequest } from "../middleware/auth.middleware";
import { FollowUpService } from "../services/follow-up.service";
import {
  FollowUpStatus,
  FollowUpType,
  FollowUpPriority,
  ContactMethod,
  ContactOutcome,
} from "../models/follow-up.model";
import { emitToBranch } from "../services/socket.service";

const service = new FollowUpService();

const requireBranch = (req: AuthRequest, res: Response): string | null => {
  const branchId = req.branchId || req.body?.branch_id || (req.query?.branch_id as string | undefined);
  if (!branchId) {
    res.status(400).json({ status: 400, message: "A branch must be selected to manage follow-ups." });
    return null;
  }
  return branchId;
};

// ─── CRUD ───────────────────────────────────────────────────────────────────

export const createFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const branchId = requireBranch(authReq, res);
  if (!branchId) return;

  const fu = await service.create({
    branch_id: branchId,
    type: req.body.type as FollowUpType,
    status: req.body.status as FollowUpStatus,
    priority: req.body.priority as FollowUpPriority,
    person_id: req.body.person_id || null,
    user_id: req.body.user_id || null,
    assigned_to: req.body.assigned_to || null,
    scheduled_date: req.body.scheduled_date || null,
    notes: req.body.notes || null,
    related_event_id: req.body.related_event_id || null,
    created_by: authReq.user.id,
  });

  emitToBranch(branchId, "followups:changed", { action: "created", id: fu.id });
  res.status(201).json({ data: fu, status: 201, message: "Follow-up created" });
});

export const listFollowUps = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const branchId = requireBranch(authReq, res);
  if (!branchId) return;

  const parseList = (v: any): any[] | undefined => {
    if (!v) return undefined;
    if (Array.isArray(v)) return v;
    return String(v).split(",").map((s) => s.trim()).filter(Boolean);
  };

  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "25"), 10)));

  const { data, total } = await service.findPaginated({
    branchId,
    page,
    limit,
    search: (req.query.search as string) || undefined,
    status: parseList(req.query.status) as any,
    type: parseList(req.query.type) as any,
    priority: parseList(req.query.priority) as any,
    assigneeId: (req.query.assigneeId as string) || undefined,
    createdById: (req.query.createdById as string) || undefined,
    from: (req.query.from as string) || undefined,
    to: (req.query.to as string) || undefined,
    overdueOnly: req.query.overdueOnly === "true" || req.query.overdueOnly === "1",
  });

  res.status(200).json({ data, total, page, limit, status: 200, message: "Follow-ups fetched" });
});

export const getFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const fu = await service.findById(req.params.id);
  if (!fu) {
    res.status(404).json({ status: 404, message: "Follow-up not found" });
    return;
  }
  res.status(200).json({ data: fu, status: 200, message: "Follow-up fetched" });
});

export const updateFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const fu = await service.update(req.params.id, {
    type: req.body.type,
    status: req.body.status,
    priority: req.body.priority,
    assigned_to: req.body.assigned_to,
    scheduled_date: req.body.scheduled_date,
    notes: req.body.notes,
    outcome_notes: req.body.outcome_notes,
  });
  emitToBranch(fu.branch_id, "followups:changed", { action: "updated", id: fu.id });
  res.status(200).json({ data: fu, status: 200, message: "Follow-up updated" });
});

export const deleteFollowUps = asyncHandler(async (req: Request, res: Response) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (ids.length === 0) {
    res.status(400).json({ status: 400, message: "'ids' must be a non-empty array" });
    return;
  }
  const deleted = await service.remove(ids);
  const branchId = (req as AuthRequest).branchId;
  if (branchId) emitToBranch(branchId, "followups:changed", { action: "deleted" });
  res.status(200).json({ status: 200, message: `${deleted} follow-up(s) deleted`, data: { deleted } });
});

// ─── Bulk ops ───────────────────────────────────────────────────────────────

export const bulkAssignFollowUps = asyncHandler(async (req: Request, res: Response) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const assignedTo = req.body.assigned_to ?? null;
  if (ids.length === 0) {
    res.status(400).json({ status: 400, message: "'ids' must be a non-empty array" });
    return;
  }
  const updated = await service.assignMany(ids, assignedTo);
  const branchId = (req as AuthRequest).branchId;
  if (branchId) emitToBranch(branchId, "followups:changed", { action: "assigned" });
  res.status(200).json({ status: 200, message: `${updated} follow-up(s) reassigned`, data: { updated } });
});

export const bulkSetStatus = asyncHandler(async (req: Request, res: Response) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const status = req.body.status as FollowUpStatus;
  if (ids.length === 0 || !status) {
    res.status(400).json({ status: 400, message: "'ids' and 'status' are required" });
    return;
  }
  const updated = await service.setStatusMany(ids, status);
  const branchId = (req as AuthRequest).branchId;
  if (branchId) emitToBranch(branchId, "followups:changed", { action: "status_changed" });
  res.status(200).json({ status: 200, message: `${updated} follow-up(s) updated`, data: { updated } });
});

export const autoAssignUnassignedFollowUps = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const branchId = requireBranch(authReq, res);
  if (!branchId) return;

  const updated = await service.autoAssignUnassigned(branchId);
  emitToBranch(branchId, "followups:changed", { action: "auto_assigned" });
  res.status(200).json({
    status: 200,
    message: `${updated} unassigned follow-up(s) assigned`,
    data: { updated },
  });
});

// ─── Stats / analytics ──────────────────────────────────────────────────────

export const getFollowUpStats = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const branchId = requireBranch(authReq, res);
  if (!branchId) return;
  const stats = await service.getStats(branchId);
  res.status(200).json({ data: stats, status: 200, message: "Stats fetched" });
});

export const getFollowUpFunnel = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const branchId = requireBranch(authReq, res);
  if (!branchId) return;
  const months = Math.max(1, Math.min(24, parseInt(String(req.query.months || "6"), 10)));
  const funnel = await service.getConversionFunnel(branchId, months);
  res.status(200).json({ data: funnel, status: 200, message: "Funnel fetched" });
});

// ─── Contact logs ───────────────────────────────────────────────────────────

export const listContactLogs = asyncHandler(async (req: Request, res: Response) => {
  const logs = await service.getContactLogs(req.params.id);
  res.status(200).json({ data: logs, status: 200, message: "Logs fetched" });
});

export const addContactLog = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const log = await service.addContactLog(req.params.id, {
    method: req.body.method as ContactMethod,
    outcome: req.body.outcome as ContactOutcome,
    notes: req.body.notes ?? null,
    contacted_at: req.body.contacted_at,
    contacted_by: authReq.user.id,
  });
  const branchId = authReq.branchId;
  if (branchId) emitToBranch(branchId, "followups:changed", { action: "contact_logged", id: req.params.id });
  res.status(201).json({ data: log, status: 201, message: "Contact log added" });
});

// ─── Saved filters ──────────────────────────────────────────────────────────

export const listSavedFilters = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const branchId = requireBranch(authReq, res);
  if (!branchId) return;
  const data = await service.listSavedFilters(authReq.user.id, branchId);
  res.status(200).json({ data, status: 200, message: "Saved filters fetched" });
});

export const createSavedFilter = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const branchId = requireBranch(authReq, res);
  if (!branchId) return;
  const name = String(req.body.name || "").trim();
  if (!name) {
    res.status(400).json({ status: 400, message: "Name is required" });
    return;
  }
  const filters = req.body.filters || {};
  const data = await service.createSavedFilter(authReq.user.id, branchId, name, filters);
  res.status(201).json({ data, status: 201, message: "Saved filter created" });
});

export const deleteSavedFilter = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const ok = await service.deleteSavedFilter(req.params.id, authReq.user.id);
  if (!ok) {
    res.status(404).json({ status: 404, message: "Saved filter not found" });
    return;
  }
  res.status(200).json({ status: 200, message: "Saved filter deleted" });
});
