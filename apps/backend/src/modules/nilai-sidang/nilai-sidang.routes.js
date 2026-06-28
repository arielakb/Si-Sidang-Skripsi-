import { Router } from "express";
import {
  finalizeNilaiSidang,
  getNilaiSidang,
  inputNilaiSidang
} from "./nilai-sidang.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";

const router = Router();

router.get(
  "/skripsi/:skripsiId",
  authenticate,
  requirePermission("nilai.read"),
  getNilaiSidang
);

router.post(
  "/skripsi/:skripsiId",
  authenticate,
  requirePermission("nilai.input"),
  inputNilaiSidang
);

router.post(
  "/skripsi/:skripsiId/finalize",
  authenticate,
  requirePermission("nilai.input"),
  finalizeNilaiSidang
);

export default router;