import { Router } from "express";
import { downloadBerkas } from "./berkas.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";

const router = Router();

router.get(
  "/:id/download",
  authenticate,
  requirePermission("berkas.download"),
  downloadBerkas
);

export default router;