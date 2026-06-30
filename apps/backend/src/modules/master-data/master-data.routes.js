import { Router } from "express";
import {
  createPeminatan,
  createRuang,
  deletePeminatanPermanent,
  deleteRuangPermanent,
  getGradingScales,
  getJenisSkripsi,
  getPeminatan,
  getRuang,
  updatePeminatan,
  updateRuang
} from "./master-data.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";

const router = Router();

router.get(
  "/peminatan",
  authenticate,
  requirePermission("master_data.read"),
  getPeminatan
);

router.get(
  "/jenis-skripsi",
  authenticate,
  requirePermission("master_data.read"),
  getJenisSkripsi
);

router.get(
  "/ruang",
  authenticate,
  requirePermission("ruang.read"),
  getRuang
);

router.get(
  "/grading-scales",
  authenticate,
  requirePermission("master_data.read"),
  getGradingScales
);

router.post(
  "/peminatan",
  authenticate,
  requirePermission("master_data.manage"),
  createPeminatan
);

router.patch(
  "/peminatan/:id",
  authenticate,
  requirePermission("master_data.manage"),
  updatePeminatan
);

router.delete(
  "/peminatan/:id",
  authenticate,
  requirePermission("master_data.delete_permanent"),
  deletePeminatanPermanent
);

router.post(
  "/ruang",
  authenticate,
  requirePermission("ruang.manage"),
  createRuang
);

router.patch(
  "/ruang/:id",
  authenticate,
  requirePermission("ruang.manage"),
  updateRuang
);

router.delete(
  "/ruang/:id",
  authenticate,
  requirePermission("master_data.delete_permanent"),
  deleteRuangPermanent
);

export default router;