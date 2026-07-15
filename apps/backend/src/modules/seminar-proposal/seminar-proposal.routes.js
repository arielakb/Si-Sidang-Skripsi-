import { Router } from "express";
import {
  agreeKodeEtik,
  assignPembimbing,
  assignPenguji,
  deleteSeminarBerkas,
  getDosenPembimbingOptions,
  getKompreSkripsiList,
  getMySeminarProposal,
  getSeminarProposalDetail,
  getSeminarProposalList,
  registerSeminarProposal,
  reviewSeminarProposal,
  uploadPresentationFile,
  uploadProposalFile,
  uploadSeminarRevision,
  uploadSuratPerjanjian
} from "./seminar-proposal.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";
import { uploadPdf, processLocalUpload } from "../../middlewares/upload/file-upload.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("skripsi.read"),
  getSeminarProposalList
);

router.get(
  "/my",
  authenticate,
  requirePermission("skripsi.read"),
  getMySeminarProposal
);

router.post(
  "/register",
  authenticate,
  requirePermission("skripsi.create"),
  registerSeminarProposal
);
router.get(
  "/kompre",
  authenticate,
  requirePermission("skripsi.read"),
  getKompreSkripsiList
);

router.get(
  "/dosen-pembimbing-options",
  authenticate,
  requirePermission("skripsi.read"),
  getDosenPembimbingOptions
);

router.patch(
  "/:id/assign-pembimbing",
  authenticate,
  requirePermission("skripsi.assign_dosen"),
  assignPembimbing
);

router.post(
  "/:id/upload-proposal",
  authenticate,
  requirePermission("berkas.upload"),
  uploadPdf.single("file"),
  processLocalUpload,
  uploadProposalFile
);

router.post(
  "/:id/upload-presentasi",
  authenticate,
  requirePermission("berkas.upload"),
  uploadPdf.single("file"),
  processLocalUpload,
  uploadPresentationFile
);

router.delete(
  "/:id/berkas/:kategori",
  authenticate,
  requirePermission("berkas.upload"),
  deleteSeminarBerkas
);

router.post(
  "/:id/kode-etik",
  authenticate,
  requirePermission("skripsi.create"),
  agreeKodeEtik
);

router.post(
  "/:id/upload-revisi",
  authenticate,
  requirePermission("revisi.upload"),
  uploadPdf.single("file"),
  processLocalUpload,
  uploadSeminarRevision
);

router.post(
  "/:id/assign-penguji",
  authenticate,
  requirePermission("skripsi.assign_dosen"),
  assignPenguji
);

router.patch(
  "/:id/review",
  authenticate,
  requirePermission("skripsi.update"),
  reviewSeminarProposal
);

router.post(
  "/:id/surat-perjanjian",
  authenticate,
  requirePermission("berkas.upload"),
  uploadPdf.single("file"),
  processLocalUpload,
  uploadSuratPerjanjian
);

router.get(
  "/:id",
  authenticate,
  requirePermission("skripsi.read"),
  getSeminarProposalDetail
);

export default router;