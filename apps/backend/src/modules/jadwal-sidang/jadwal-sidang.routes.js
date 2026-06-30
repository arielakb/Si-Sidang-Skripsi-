import { Router } from "express";
import {
  createJadwalSidang,
  deleteJadwalSidangPermanent,
  getJadwalSidang,
  getJadwalSidangDetail,
  updateJadwalSidangStatus
} from "./jadwal-sidang.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("jadwal_sidang.read"),
  getJadwalSidang
);

router.get(
  "/:id",
  authenticate,
  requirePermission("jadwal_sidang.read"),
  getJadwalSidangDetail
);

router.post(
  "/",
  authenticate,
  requirePermission("jadwal_sidang.manage"),
  createJadwalSidang
);

router.patch(
  "/:id/status",
  authenticate,
  requirePermission("jadwal_sidang.manage"),
  updateJadwalSidangStatus
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("jadwal_sidang.delete_permanent"),
  deleteJadwalSidangPermanent
);

export default router;