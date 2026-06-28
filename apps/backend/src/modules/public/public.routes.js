import { Router } from "express";
import {
  getPublicJadwalSidang,
  getPublicJadwalSidangDetail,
  getPublicJenisSkripsi
} from "./public.controller.js";

const router = Router();

router.get("/jadwal-sidang", getPublicJadwalSidang);
router.get("/jadwal-sidang/:id", getPublicJadwalSidangDetail);
router.get("/jenis-skripsi", getPublicJenisSkripsi);

export default router;