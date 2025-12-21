import { RequestHandler, Router } from "express";
import { PermissionController } from "../../controllers/role-permission/permission.controller";
import { RoleController } from "../../controllers/role-permission/role.controller";
import { UserService } from "../../services/user.service";
import { adminMiddleware, authMiddleware } from "../../middleware/auth.middleware";

const permissionController = new PermissionController();
const roleController = new RoleController();
const router = Router();

//Roles
router.post('/role', authMiddleware(new UserService()) as RequestHandler, adminMiddleware, roleController.createRole);
router.put('/role/:roleId', authMiddleware(new UserService()) as RequestHandler, adminMiddleware, roleController.updateRole);
router.delete('/role/:roleId', authMiddleware(new UserService()) as RequestHandler, adminMiddleware, roleController.deleteRole);
router.get('/role', authMiddleware(new UserService()) as RequestHandler, adminMiddleware, roleController.getCommunityRoles);
router.get('/role/:roleId', authMiddleware(new UserService()) as RequestHandler, adminMiddleware, roleController.getRoleDetails);

// Permissions
router.post('/permission', authMiddleware(new UserService()) as RequestHandler, adminMiddleware, permissionController.createPermission);
router.put('/permission/:permissionId', authMiddleware(new UserService()) as RequestHandler, adminMiddleware, permissionController.updatePermission);
router.get('/permission', authMiddleware(new UserService()) as RequestHandler, adminMiddleware, permissionController.getAllPermissions);
router.get('/permission/:permissionId', authMiddleware(new UserService()) as RequestHandler, adminMiddleware, permissionController.getPermissionById);
router.get('/permission/name/:permissionName', authMiddleware(new UserService()) as RequestHandler, adminMiddleware, permissionController.getPermissionByName);

export default router;
