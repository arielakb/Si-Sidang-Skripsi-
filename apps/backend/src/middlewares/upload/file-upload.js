import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../../config/env.js";

function ensureDirectoryExists(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(env.upload.dir, "seminar-proposal");
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
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