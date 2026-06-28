import { Router } from "express";
import {
  approveFinalSkripsi,
  rejectFinalSkripsi,
  uploadFinalSkripsi,
  uploadLembarPengesahan
} from "./finalisasi.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";
import { uploadPdf } from "../../middlewares/upload/file-upload.js";

const router = Router();

router.post(
  "/skripsi/:skripsiId/upload-final",
  authenticate,
  requirePermission("berkas.upload"),
  uploadPdf.single("file"),
  uploadFinalSkripsi
);

router.post(
  "/skripsi/:skripsiId/upload-pengesahan",
  authenticate,
  requirePermission("berkas.upload"),
  uploadPdf.single("file"),
  uploadLembarPengesahan
);

router.post(
  "/skripsi/:skripsiId/approve-final",
  authenticate,
  requirePermission("skripsi.approve_final"),
  approveFinalSkripsi
);

router.post(
  "/skripsi/:skripsiId/reject-final",
  authenticate,
  requirePermission("skripsi.approve_final"),
  rejectFinalSkripsi
);

export default router;