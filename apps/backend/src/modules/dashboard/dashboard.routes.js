import { Router } from "express";
import { getMyDashboardSummary } from "./dashboard.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";

const router = Router();

router.get(
  "/my-summary",
  authenticate,
  getMyDashboardSummary
);

export default router;