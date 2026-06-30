import { Router } from "express";
import {
  approveRevisiSeminarHasilSidang,
  assignPengujiSidang,
  createJadwalSidangWorkflow,
  getDosenPengujiOptions,
  getSidangBySkripsi,
  getSidangList,
  inputHasilSidang,
  inputNilaiSidangWorkflow,
  registerSeminarProposalAttempt,
  uploadBerkasSidang,
  uploadRevisiSeminarHasilSidang,
  uploadSuratPerjanjianSidang
} from "./sidang.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";
import { uploadPdf } from "../../middlewares/upload/file-upload.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("sidang.read"),
  getSidangList
);

router.get(
  "/dosen-penguji-options",
  authenticate,
  requirePermission("sidang.assign_penguji"),
  getDosenPengujiOptions
);

router.get(
  "/skripsi/:skripsiId",
  authenticate,
  requirePermission("sidang.read"),
  getSidangBySkripsi
);

router.post(
  "/seminar-proposal/register",
  authenticate,
  requirePermission("skripsi.create"),
  registerSeminarProposalAttempt
);

router.post(
  "/:sidangId/assign-penguji",
  authenticate,
  requirePermission("sidang.assign_penguji"),
  assignPengujiSidang
);

router.post(
  "/:sidangId/jadwal",
  authenticate,
  requirePermission("sidang.manage"),
  createJadwalSidangWorkflow
);

router.post(
  "/:sidangId/nilai",
  authenticate,
  requirePermission("nilai.input"),
  inputNilaiSidangWorkflow
);

router.post(
  "/:sidangId/hasil",
  authenticate,
  requirePermission("sidang.input_hasil"),
  inputHasilSidang
);

router.post(
  "/:sidangId/revisi/upload",
  authenticate,
  requirePermission("berkas.upload"),
  uploadPdf.single("file"),
  uploadRevisiSeminarHasilSidang
);

router.patch(
  "/:sidangId/revisi/:revisiId/approve",
  authenticate,
  requirePermission("sidang.input_hasil"),
  approveRevisiSeminarHasilSidang
);

router.post(
  "/:sidangId/berkas/:kategori",
  authenticate,
  requirePermission("berkas.upload"),
  uploadPdf.single("file"),
  uploadBerkasSidang
);

router.post(
  "/:sidangId/upload-surat-perjanjian",
  authenticate,
  requirePermission("sidang.upload_surat"),
  uploadPdf.single("file"),
  uploadSuratPerjanjianSidang
);

export default router;
