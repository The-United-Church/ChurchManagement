import { RequestHandler, Router } from 'express';
import {
	createDepartment,
	getDepartments,
	getDepartmentById,
	updateDepartment,
	deleteDepartment
} from '../controllers/catalogs/department.controller';
import {
	createCategory,
	getCategories,
	getCategoryById,
	updateCategory,
	deleteCategory,
	createManyCategories
} from '../controllers/catalogs/category.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { UserService } from '../services/user.service';
const router = Router();

// Category CRUD
router.post('/categories', authMiddleware(new UserService()) as RequestHandler, createCategory);
router.post('/categories/import', authMiddleware(new UserService()) as RequestHandler, createManyCategories);
router.get('/categories', authMiddleware(new UserService()) as RequestHandler, getCategories);
router.get('/categories/:id', authMiddleware(new UserService()) as RequestHandler, getCategoryById);
router.put('/categories/:id', authMiddleware(new UserService()) as RequestHandler, updateCategory);
router.delete('/categories/:id', authMiddleware(new UserService()) as RequestHandler, deleteCategory);

// Department CRUD
router.post('/departments', authMiddleware(new UserService()) as RequestHandler, createDepartment);
router.get('/departments', authMiddleware(new UserService()) as RequestHandler, getDepartments);
router.get('/departments/:id', authMiddleware(new UserService()) as RequestHandler, getDepartmentById);
router.put('/departments/:id', authMiddleware(new UserService()) as RequestHandler, updateDepartment);
router.delete('/departments/:id', authMiddleware(new UserService()) as RequestHandler, deleteDepartment);

export default router;
