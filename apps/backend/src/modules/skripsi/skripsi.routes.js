import { Router } from "express";
import {
  approveMajuSidang,
  assignPembimbing,
  getBimbinganCounter,
  getMySkripsi,
  getSkripsiDetail,
  getSkripsiList
} from "./skripsi.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("skripsi.read"),
  getSkripsiList
);

router.get(
  "/my",
  authenticate,
  requirePermission("skripsi.read"),
  getMySkripsi
);

router.get(
  "/:id",
  authenticate,
  requirePermission("skripsi.read"),
  getSkripsiDetail
);

router.get(
  "/:id/bimbingan-counter",
  authenticate,
  requirePermission("bimbingan.read"),
  getBimbinganCounter
);

router.post(
  "/:id/assign-pembimbing",
  authenticate,
  requirePermission("skripsi.assign_dosen"),
  assignPembimbing
);

router.post(
  "/:id/approve-maju-sidang",
  authenticate,
  requirePermission("skripsi.approve_sidang"),
  approveMajuSidang
);

export default router;