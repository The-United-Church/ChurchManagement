import { Router } from "express";
import { recordWebsiteVisit, getWebsiteVisitStats } from "../controllers/website-visit.controller";
import { adminMiddleware, authMiddleware } from "../middleware/auth.middleware";
import { UserService } from "../services/user/user.service";
import type { RequestHandler } from "express";

const router = Router();

router.post("/", recordWebsiteVisit);
router.get(
  "/stats",
  authMiddleware(new UserService()) as RequestHandler,
  adminMiddleware,
  getWebsiteVisitStats,
);

export default router;
