import { Router } from "express";
import { getAuditLogs } from "./audit-logs.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("audit.read"),
  getAuditLogs
);

export default router;