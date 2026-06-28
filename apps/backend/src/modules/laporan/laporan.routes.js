import { Router } from "express";
import {
  exportLaporanSkripsiExcel,
  exportLaporanSkripsiPdf,
  getLaporanSkripsi,
  getLaporanSummary
} from "./laporan.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";

const router = Router();

router.get(
  "/summary",
  authenticate,
  requirePermission("laporan.read"),
  getLaporanSummary
);

router.get(
  "/skripsi",
  authenticate,
  requirePermission("laporan.read"),
  getLaporanSkripsi
);

router.get(
  "/skripsi/export.xlsx",
  authenticate,
  requirePermission("laporan.export"),
  exportLaporanSkripsiExcel
);

router.get(
  "/skripsi/export.pdf",
  authenticate,
  requirePermission("laporan.export"),
  exportLaporanSkripsiPdf
);

export default router;