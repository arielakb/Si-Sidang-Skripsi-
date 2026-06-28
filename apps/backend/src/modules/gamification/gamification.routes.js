import { Router } from "express";
import {
  getLeaderboard,
  getMyGamificationDashboard,
  getSkripsiProgress,
  syncSkripsiGamification
} from "./gamification.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";

const router = Router();

router.get(
  "/my-dashboard",
  authenticate,
  requirePermission("gamification.read"),
  getMyGamificationDashboard
);

router.get(
  "/leaderboard",
  authenticate,
  requirePermission("gamification.read"),
  getLeaderboard
);

router.get(
  "/skripsi/:skripsiId/progress",
  authenticate,
  requirePermission("gamification.read"),
  getSkripsiProgress
);

router.post(
  "/skripsi/:skripsiId/sync",
  authenticate,
  requirePermission("gamification.read"),
  syncSkripsiGamification
);

export default router;