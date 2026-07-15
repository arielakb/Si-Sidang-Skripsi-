import { Router } from "express";
import {
  createRevisiSidang,
  deleteRevisiSidangPermanent,
  getRevisiBySkripsi,
  reviewRevisiSidang,
  uploadRevisiSidang
} from "./revisi-sidang.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";
import { uploadPdf, processLocalUpload } from "../../middlewares/upload/file-upload.js";

const router = Router();

router.get(
  "/skripsi/:skripsiId",
  authenticate,
  requirePermission("skripsi.read"),
  getRevisiBySkripsi
);

router.post(
  "/skripsi/:skripsiId",
  authenticate,
  requirePermission("revisi.create"),
  createRevisiSidang
);

router.post(
  "/:revisiId/upload",
  authenticate,
  requirePermission("revisi.upload"),
  uploadPdf.single("file"),
  processLocalUpload,
  uploadRevisiSidang
);

router.patch(
  "/:revisiId/review",
  authenticate,
  requirePermission("revisi.approve"),
  reviewRevisiSidang
);

router.delete(
  "/:revisiId",
  authenticate,
  requirePermission("revisi.delete_permanent"),
  deleteRevisiSidangPermanent
);

export default router;