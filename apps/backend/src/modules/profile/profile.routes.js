import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { getMyProfile, updateMyProfile } from "./profile.controller.js";

const router = Router();

router.get("/me", authenticate, getMyProfile);
router.patch("/me", authenticate, updateMyProfile);

export default router;