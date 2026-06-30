import { Router } from "express";
import {
  approvePeminjamanRuang,
  createPeminjamanRuang,
  deletePeminjamanRuangPermanent,
  getMyPeminjamanRuang,
  getPeminjamanRuang,
  rejectPeminjamanRuang,
  updatePeminjamanRuangStatus
} from "./peminjaman-ruang.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("ruang.approve"),
  getPeminjamanRuang
);

router.get(
  "/my",
  authenticate,
  requirePermission("ruang.borrow"),
  getMyPeminjamanRuang
);

router.post(
  "/",
  authenticate,
  requirePermission("ruang.borrow"),
  createPeminjamanRuang
);

router.patch(
  "/:id/approve",
  authenticate,
  requirePermission("ruang.approve"),
  approvePeminjamanRuang
);

router.patch(
  "/:id/reject",
  authenticate,
  requirePermission("ruang.approve"),
  rejectPeminjamanRuang
);

router.patch(
  "/:id/status",
  authenticate,
  requirePermission("ruang.approve"),
  updatePeminjamanRuangStatus
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("ruang.delete_permanent"),
  deletePeminjamanRuangPermanent
);

export default router;