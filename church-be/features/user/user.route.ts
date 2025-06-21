import { Router } from 'express';
import { UserController } from './user.controller';

const router = Router();
const userController = new UserController();

router.get('/users', userController.getUsers.bind(userController));
router.post('/users', userController.createUser.bind(userController));
router.get('/users/:id', userController.getUserById.bind(userController));

export default router;