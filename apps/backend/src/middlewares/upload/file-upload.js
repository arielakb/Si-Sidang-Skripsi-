import multer from "multer";
import { env } from "../../config/env.js";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client
const supabase = createClient(env.supabase.url, env.supabase.key);

const storage = multer.memoryStorage();

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

// Middleware to upload to Supabase Storage
export async function uploadToSupabase(req, res, next) {
  if (!req.file) {
    return next();
  }

  try {
    const safeOriginalName = req.file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.\-_]/g, "");
    
    const uniqueName = `${Date.now()}-${cryptoRandom()}-${safeOriginalName}`;
    const bucketName = "berkas";
    const filePath = `seminar-proposal/${uniqueName}`; // We keep the folder structure for organization

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      console.error("Supabase Storage Error:", error);
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    // Overwrite the path with the Supabase public URL
    // so controllers that read req.file.path continue to work seamlessly
    req.file.path = publicUrlData.publicUrl;
    req.file.filename = uniqueName;

    next();
  } catch (error) {
    console.error("Error in uploadToSupabase middleware:", error);
    next(error);
  }
}