import { Router } from "express";
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  markAttendance,
  removeAttendance,
  getEventAttendance,
  getAttendanceSummary,
} from "../controllers/event.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";
import { UserService } from "../services/user.service";
import type { RequestHandler } from "express";

const router = Router();
const auth = authMiddleware(new UserService()) as RequestHandler;

// ─── Event CRUD ─────────────────────────────────────────────────
router.post("/", auth, createEvent);
router.get("/", auth, getEvents);
router.get("/:id", auth, getEventById);
router.put("/:id", auth, updateEvent);
router.delete("/:id", auth, deleteEvent);

// ─── Attendance ─────────────────────────────────────────────────
router.post("/:eventId/attendance", auth, markAttendance);
router.get("/:eventId/attendance", auth, getEventAttendance);
router.get("/:eventId/attendance/summary", auth, getAttendanceSummary);
router.delete("/:eventId/attendance/:userId", auth, removeAttendance);

export default router;
