import { Router } from "express";
import {
  approveMajuSidang,
  completeBimbingan,
  confirmBimbingan,
  getBimbinganBySkripsi,
  rejectBimbingan,
  requestBimbingan,
  validateBimbinganByMahasiswa
} from "./bimbingan.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";

const router = Router();

router.get(
  "/skripsi/:skripsiId",
  authenticate,
  requirePermission("bimbingan.read"),
  getBimbinganBySkripsi
);

router.post(
  "/skripsi/:skripsiId/request",
  authenticate,
  requirePermission("bimbingan.create"),
  requestBimbingan
);

router.patch(
  "/skripsi/:skripsiId/approve-maju-sidang",
  authenticate,
  requirePermission("skripsi.approve_sidang"),
  approveMajuSidang
);

router.patch(
  "/:id/confirm",
  authenticate,
  requirePermission("bimbingan.confirm"),
  confirmBimbingan
);

router.patch(
  "/:id/reject",
  authenticate,
  requirePermission("bimbingan.confirm"),
  rejectBimbingan
);

router.patch(
  "/:id/complete",
  authenticate,
  requirePermission("bimbingan.confirm"),
  completeBimbingan
);

router.patch(
  "/:id/validate",
  authenticate,
  requirePermission("bimbingan.validate"),
  validateBimbinganByMahasiswa
);

export default router;