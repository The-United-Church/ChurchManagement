import { RequestHandler, Router } from "express";
import { login, forgotPassword, register, verifyResetOtp, setNewPassword, changePassword } from "../controllers/auth.controller";
import { UserService } from "../services/user.service";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/signup", register);
router.post("/login", login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/set-new-password', setNewPassword);
router.post('/change-password', authMiddleware(new UserService()) as RequestHandler, changePassword);


export default router;