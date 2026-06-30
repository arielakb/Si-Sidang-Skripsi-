import { Router } from "express";
import {
  getPublicJadwalSidang,
  getPublicJadwalSidangDetail,
  getPublicJenisSkripsi,
  getPublicRuang
} from "./public.controller.js";

const router = Router();

router.get("/jadwal-sidang", getPublicJadwalSidang);
router.get("/jadwal-sidang/:id", getPublicJadwalSidangDetail);
router.get("/jenis-skripsi", getPublicJenisSkripsi);
router.get("/ruang", getPublicRuang);

export default router;
