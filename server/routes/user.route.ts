import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { UserService } from "../services/user/user.service";
import { adminMiddleware, authMiddleware } from "../middleware/auth.middleware";
import type { RequestHandler } from "express";

const router = Router();
const userController = new UserController();

router.post(
  "/",
  authMiddleware(new UserService()) as RequestHandler,
  adminMiddleware,
  userController.createUser.bind(userController)
);

router.post(
  "/import",
  authMiddleware(new UserService()) as RequestHandler,
  adminMiddleware,
  userController.createManyUsers.bind(userController)
);

router.get(
  "/",
  authMiddleware(new UserService()) as RequestHandler,
  userController.getUsers.bind(userController)
);

// Statistics and special routes (must be before /:id)
router.get(
  "/statistics",
  authMiddleware(new UserService()) as RequestHandler,
  adminMiddleware,
  userController.getUserStatistics.bind(userController)
);

router.get(
  "/permissions",
  authMiddleware(new UserService()) as RequestHandler,
  adminMiddleware,
  userController.getAllPermissions.bind(userController)
);

router.get(
  "/filter",
  authMiddleware(new UserService()) as RequestHandler,
  adminMiddleware,
  userController.getUsersWithFilters.bind(userController)
);

// Global user directory — no branch scoping, used for the "Add from Users" picker
router.get(
  "/directory",
  authMiddleware(new UserService()) as RequestHandler,
  userController.getDirectory.bind(userController)
);

router.get(
  "/lookup/by-email",
  authMiddleware(new UserService()) as RequestHandler,
  userController.getUserByEmail.bind(userController)
);

router.put(
  "/users/me",
  authMiddleware(new UserService()) as RequestHandler,
  userController.updateProfile.bind(userController)
);

router.get(
  "/profile",
  authMiddleware(new UserService()) as RequestHandler,
  userController.getUserProfile.bind(userController)
);

router.get(
  "/churches",
  authMiddleware(new UserService()) as RequestHandler,
  userController.getUserChurches.bind(userController)
);

// Must be before /:id to avoid Express treating "settings" as an id param
router.put(
  "/settings",
  authMiddleware(new UserService()) as RequestHandler,
  userController.updateSettings.bind(userController)
);

router.get(
  "/:userId/permissions",
  authMiddleware(new UserService()) as RequestHandler,
  adminMiddleware,
  userController.getUserPermissions.bind(userController)
);

router.get(
  "/:id",
  authMiddleware(new UserService()) as RequestHandler,
  userController.getUserById.bind(userController)
);

router.put(
  "/:id",
  authMiddleware(new UserService()) as RequestHandler,
  adminMiddleware,
  userController.updateUserInfo.bind(userController)
);

router.put(
  "/:id/status",
  authMiddleware(new UserService()) as RequestHandler,
  adminMiddleware,
  userController.updateUserStatus.bind(userController)
);

router.put(
  "/:id/role",
  authMiddleware(new UserService()) as RequestHandler,
  adminMiddleware,
  userController.updateUserRole.bind(userController)
);

router.put(
  "/:id/permissions",
  authMiddleware(new UserService()) as RequestHandler,
  adminMiddleware,
  userController.updateUserPermissions.bind(userController)
);

router.delete(
  "/bulk",
  authMiddleware(new UserService()) as RequestHandler,
  adminMiddleware,
  userController.deleteManyUsers.bind(userController)
);

router.delete(
  "/:id",
  authMiddleware(new UserService()) as RequestHandler,
  adminMiddleware,
  userController.deleteUser.bind(userController)
);

export default router;
