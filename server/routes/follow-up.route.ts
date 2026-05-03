import { Router } from "express";
import type { RequestHandler } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { UserService } from "../services/user/user.service";
import {
  createFollowUp,
  listFollowUps,
  getFollowUp,
  updateFollowUp,
  deleteFollowUps,
  autoAssignUnassignedFollowUps,
  bulkAssignFollowUps,
  bulkSetStatus,
  getFollowUpStats,
  getFollowUpFunnel,
  listContactLogs,
  addContactLog,
  listSavedFilters,
  createSavedFilter,
  deleteSavedFilter,
} from "../controllers/follow-up.controller";

const router = Router();
const auth = authMiddleware(new UserService()) as RequestHandler;

router.use(auth);

// Stats / analytics
router.get("/stats", getFollowUpStats);
router.get("/funnel", getFollowUpFunnel);

// Saved filters
router.get("/saved-filters", listSavedFilters);
router.post("/saved-filters", createSavedFilter);
router.delete("/saved-filters/:id", deleteSavedFilter);

// Bulk ops
router.post("/bulk/auto-assign", autoAssignUnassignedFollowUps);
router.post("/bulk/assign", bulkAssignFollowUps);
router.post("/bulk/status", bulkSetStatus);

// Contact logs
router.get("/:id/logs", listContactLogs);
router.post("/:id/logs", addContactLog);

// CRUD
router.get("/", listFollowUps);
router.post("/", createFollowUp);
router.get("/:id", getFollowUp);
router.put("/:id", updateFollowUp);
router.delete("/", deleteFollowUps);

export default router;
