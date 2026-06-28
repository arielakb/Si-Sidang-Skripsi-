import { Router } from "express";
import {
  approvePeminjamanRuang,
  createPeminjamanRuang,
  getMyPeminjamanRuang,
  getPeminjamanRuang,
  rejectPeminjamanRuang
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

export default router;