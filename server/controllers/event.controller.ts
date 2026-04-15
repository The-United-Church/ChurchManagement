import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { EventService } from "../services/event.service";
import { AttendanceService } from "../services/attendance.service";
import { ActivityAction, EntityType } from "../models/activity-log.model";
import { logActivity } from "../utils/activityLogger";
import { emitToBranch } from "../services/socket.service";
import asyncHandler from "../utils/asyncHandler";
import CustomError from "../utils/customError";
import { sendEventNotificationEmail } from "../email/email.event_notification";
// import { sendEventNotificationEmail } from "../email/email.event_notification";

const eventService = new EventService();
const attendanceService = new AttendanceService();

// ── Event CRUD ──────────────────────────────────────────────────

export const createEvent = asyncHandler(async (req, res) => {
  const authReq = req as AuthRequest;
  const branchId = authReq.branchId;
  if (!branchId) throw new CustomError("Branch ID is required (X-Branch-Id header)", 400);

  const canManage = authReq.user.role === "super_admin" || await eventService.canManageEvent(authReq.user.id, branchId);
  if (!canManage) throw new CustomError("Only admins or coordinators can create events", 403);

  const event = await eventService.create({ ...req.body, branch_id: branchId, created_by: authReq.user.id });

  logActivity(authReq.user.id, ActivityAction.CREATE, EntityType.EVENT, event.id, `Event "${event.title}" created`, { eventTitle: event.title });
  emitToBranch(branchId, "events:changed", { action: "created", eventId: event.id });

  // Fire-and-forget email notification
  sendEventNotificationEmail(event).catch((err: unknown) => console.error("Event email failed:", err));

  res.status(201).json({ status: 201, data: event, message: "Event created successfully" });
});

export const getEvents = asyncHandler(async (req, res) => {
  const authReq = req as AuthRequest;
  const branchId = authReq.branchId;
  if (!branchId) throw new CustomError("Branch ID is required", 400);

  const isManager = authReq.user.role === "super_admin" || await eventService.canManageEvent(authReq.user.id, branchId);
  const filters = {
    branch_id: branchId,
    page: Number(req.query.page) || 1,
    limit: Math.min(Number(req.query.limit) || 25, 100),
    category: req.query.category as string | undefined,
    from_date: req.query.from_date as string | undefined,
    to_date: req.query.to_date as string | undefined,
    user_id: authReq.user.id,
    include_unpublished: isManager,
  };

  const result = isManager ? await eventService.findByBranch(filters) : await eventService.getVisibleEvents(filters);
  res.json({ status: 200, data: result.events, total: result.total });
});

export const getEventById = asyncHandler(async (req, res) => {
  const event = await eventService.findById(req.params.id);
  if (!event) throw new CustomError("Event not found", 404);
  res.json({ status: 200, data: event });
});

export const updateEvent = asyncHandler(async (req, res) => {
  const authReq = req as AuthRequest;
  const existing = await eventService.findById(req.params.id);
  if (!existing) throw new CustomError("Event not found", 404);

  const canManage = authReq.user.role === "super_admin" || await eventService.canManageEvent(authReq.user.id, existing.branch_id);
  if (!canManage) throw new CustomError("Only admins or coordinators can update events", 403);

  const updated = await eventService.update(req.params.id, req.body);

  logActivity(authReq.user.id, ActivityAction.UPDATE, EntityType.EVENT, updated.id, `Event "${updated.title}" updated`, { eventTitle: updated.title });
  emitToBranch(existing.branch_id, "events:changed", { action: "updated", eventId: updated.id });

  res.json({ status: 200, data: updated, message: "Event updated successfully" });
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const authReq = req as AuthRequest;
  const existing = await eventService.findById(req.params.id);
  if (!existing) throw new CustomError("Event not found", 404);

  const canManage = authReq.user.role === "super_admin" || await eventService.canManageEvent(authReq.user.id, existing.branch_id);
  if (!canManage) throw new CustomError("Only admins or coordinators can delete events", 403);

  await eventService.remove(req.params.id);

  logActivity(authReq.user.id, ActivityAction.DELETE, EntityType.EVENT, existing.id, `Event "${existing.title}" deleted`, { eventTitle: existing.title });
  emitToBranch(existing.branch_id, "events:changed", { action: "deleted", eventId: existing.id });

  res.json({ status: 200, message: "Event deleted successfully" });
});

// ── Attendance ──────────────────────────────────────────────────

export const markAttendance = asyncHandler(async (req, res) => {
  const authReq = req as AuthRequest;
  const { event_date, user_id, check_in_lat, check_in_lng } = req.body;
  const eventId = req.params.eventId;
  const targetUserId = user_id || authReq.user.id;

  // If marking for someone else, must be admin/coordinator
  if (targetUserId !== authReq.user.id) {
    const event = await eventService.findById(eventId);
    if (!event) throw new CustomError("Event not found", 404);
    const isAdmin = await attendanceService.isAdminOrCoordinator(authReq.user.id, event.branch_id);
    if (!isAdmin) throw new CustomError("Only admins/coordinators can mark attendance for others", 403);
  }

  const record = await attendanceService.markAttendance({
    event_id: eventId,
    event_date,
    user_id: targetUserId,
    marked_by: targetUserId !== authReq.user.id ? authReq.user.id : undefined,
    check_in_lat,
    check_in_lng,
  });

  res.status(201).json({ status: 201, data: record, message: "Attendance marked" });
});

export const removeAttendance = asyncHandler(async (req, res) => {
  const authReq = req as AuthRequest;
  const { eventId, userId } = req.params;
  const { event_date } = req.query as { event_date: string };

  if (userId !== authReq.user.id) {
    const event = await eventService.findById(eventId);
    if (!event) throw new CustomError("Event not found", 404);
    const isAdmin = await attendanceService.isAdminOrCoordinator(authReq.user.id, event.branch_id);
    if (!isAdmin) throw new CustomError("Only admins can remove others' attendance", 403);
  }

  await attendanceService.removeAttendance(eventId, event_date, userId);
  res.json({ status: 200, message: "Attendance removed" });
});

export const getEventAttendance = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const eventDate = req.query.event_date as string;
  if (!eventDate) throw new CustomError("event_date query param is required", 400);

  const records = await attendanceService.getEventAttendance(eventId, eventDate);
  res.json({ status: 200, data: records });
});

export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const summary = await attendanceService.getAttendanceSummary(req.params.eventId);
  res.json({ status: 200, data: summary });
});

// ── Public / Guest (QR code) ───────────────────────────────────

export const getPublicEventInfo = asyncHandler(async (req, res) => {
  const info = await attendanceService.getPublicEventInfo(req.params.eventId);
  if (!info) throw new CustomError("Event not found", 404);
  res.json({ status: 200, data: info });
});

export const guestCheckIn = asyncHandler(async (req, res) => {
  const { event_date, first_name, last_name, email, phone, country, state, address, comments, custom_responses, check_in_lat, check_in_lng } = req.body;
  const eventId = req.params.eventId;
  if (!first_name || !last_name) throw new CustomError("First name and last name are required", 400);
  if (!event_date) throw new CustomError("Event date is required", 400);

  const record = await attendanceService.markGuestAttendance({
    event_id: eventId,
    event_date,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    email: email?.trim() || undefined,
    phone: phone?.trim() || undefined,
    country: country?.trim() || undefined,
    state: state?.trim() || undefined,
    address: address?.trim() || undefined,
    comments: comments?.trim() || undefined,
    custom_responses: custom_responses || undefined,
    check_in_lat,
    check_in_lng,
  });

  res.status(201).json({ status: 201, data: record, message: "Attendance marked successfully" });
});

export const getGuestAttendance = asyncHandler(async (req, res) => {
  const authReq = req as AuthRequest;
  const { eventId } = req.params;
  const eventDate = req.query.event_date as string;
  if (!eventDate) throw new CustomError("event_date query param is required", 400);

  const event = await eventService.findById(eventId);
  if (!event) throw new CustomError("Event not found", 404);

  const canManage = authReq.user.role === "super_admin" || await eventService.canManageEvent(authReq.user.id, event.branch_id);
  if (!canManage) throw new CustomError("Only admins or coordinators can view guest attendance", 403);

  const records = await attendanceService.getGuestAttendance(eventId, eventDate);
  res.json({ status: 200, data: records });
});
