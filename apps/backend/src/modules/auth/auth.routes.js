import { Router } from "express";
import { login, logout, me, refresh } from "./auth.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";

const router = Router();

router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authenticate, me);

export default router;