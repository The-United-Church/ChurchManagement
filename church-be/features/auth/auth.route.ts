// routes/auth.routes.ts
import { Router } from "express";
import { login, register } from "./auth.controller";

const router = Router();

router.post("/signup", register);
router.post("/login", login);

export default router;
