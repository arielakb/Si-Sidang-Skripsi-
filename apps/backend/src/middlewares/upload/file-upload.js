import multer from "multer";
import { env } from "../../config/env.js";
import fs from "fs";
import path from "path";

const uploadDir = path.join(process.cwd(), "uploads", "berkas");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const safeOriginalName = file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.\-_]/g, "");
    const uniqueName = `${Date.now()}-${cryptoRandom()}-${safeOriginalName}`;
    cb(null, uniqueName);
  }
});

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 10);
}

function fileFilter(req, file, cb) {
  const allowedMimeTypes = ["application/pdf"];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Hanya file PDF yang diperbolehkan"));
  }

  return cb(null, true);
}

export const uploadPdf = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.upload.maxFileSizeMb * 1024 * 1024
  }
});

export function processLocalUpload(req, res, next) {
  if (!req.file) {
    return next();
  }

  const publicUrl = `${req.protocol}://${req.get("host")}/uploads/berkas/${req.file.filename}`;
  req.file.path = publicUrl;
  
  next();
}