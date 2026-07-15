import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import cookieParser from "cookie-parser";
import { enableBigIntJsonSerialization } from "./utils/json.js";
import authRoutes from "./modules/auth/auth.routes.js";
import profileRoutes from "./modules/profile/profile.routes.js";
import userRoutes from "./modules/users/users.routes.js";
import masterDataRoutes from "./modules/master-data/master-data.routes.js";
import publicRoutes from "./modules/public/public.routes.js";
import seminarProposalRoutes from "./modules/seminar-proposal/seminar-proposal.routes.js";
import skripsiRoutes from "./modules/skripsi/skripsi.routes.js";
import bimbinganRoutes from "./modules/bimbingan/bimbingan.routes.js";
import jadwalSidangRoutes from "./modules/jadwal-sidang/jadwal-sidang.routes.js";
import peminjamanRuangRoutes from "./modules/peminjaman-ruang/peminjaman-ruang.routes.js";
import notificationRoutes from "./modules/notifications/notifications.routes.js";
import gamificationRoutes from "./modules/gamification/gamification.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import { auditLogMiddleware } from "./middlewares/audit-log.js";
import auditLogRoutes from "./modules/audit-logs/audit-logs.routes.js";
import berkasRoutes from "./modules/berkas/berkas.routes.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { errorHandler } from "./middlewares/error-handler.js";
import laporanRoutes from "./modules/laporan/laporan.routes.js";
import healthRoutes from "./modules/health/health.routes.js";
import sidangRoutes from "./modules/sidang/sidang.routes.js";
import workflowRoutes from "./modules/workflow/workflow.routes.js";

enableBigIntJsonSerialization();

export const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.server.corsOrigin,
    credentials: true
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(auditLogMiddleware);

app.use(morgan(env.app.environment === "production" ? "combined" : "dev"));

app.use(
  rateLimit({
    windowMs: env.security.rateLimitWindowMinutes * 60 * 1000,
    max:
      env.app.environment === "production"
        ? env.security.rateLimitMaxRequests
        : 10000,
    standardHeaders: true,
    legacyHeaders: false
  })
);

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/users", userRoutes);
app.use("/api/master-data", masterDataRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/seminar-proposal", seminarProposalRoutes);
app.use("/api/skripsi", skripsiRoutes);
app.use("/api/sidang", sidangRoutes);
app.use("/api/workflow", workflowRoutes);
app.use("/api/bimbingan", bimbinganRoutes);
app.use("/api/jadwal-sidang", jadwalSidangRoutes);
app.use("/api/peminjaman-ruang", peminjamanRuangRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/berkas", berkasRoutes);
app.use("/api/laporan", laporanRoutes);

app.get("/api/health-check", (req, res) => {
  res.json({
    success: true,
    message: "Sisidang backend is running",
    environment: env.app.environment
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.use((err, req, res, next) => {
  console.error(err);

  if (err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  if (err.message === "Hanya file PDF yang diperbolehkan") {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});
