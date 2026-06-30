import { Router } from "express";
import {
  getWorkflowSkripsiActions,
  getWorkflowSkripsiDetail,
  getWorkflowSkripsiList
} from "./workflow.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";

const router = Router();

router.get(
  "/skripsi",
  authenticate,
  requirePermission("sidang.read"),
  getWorkflowSkripsiList
);

router.get(
  "/skripsi/:skripsiId",
  authenticate,
  requirePermission("sidang.read"),
  getWorkflowSkripsiDetail
);

router.get(
  "/skripsi/:skripsiId/actions",
  authenticate,
  requirePermission("sidang.read"),
  getWorkflowSkripsiActions
);

export default router;
