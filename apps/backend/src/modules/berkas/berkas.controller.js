import fs from "fs";
import path from "path";
import { prisma } from "../../config/prisma.js";
import { getUserRoles } from "../rbac/rbac.service.js";

function resolveFilePath(filePath) {
  if (!filePath) return null;

  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  return path.resolve(process.cwd(), filePath);
}

async function canAccessBerkas(userId, berkas) {
  const roles = await getUserRoles(userId);

  if (
    roles.includes("admin") ||
    roles.includes("ketua_prodi") ||
    roles.includes("staf_prodi") ||
    roles.includes("dosen_koordinator")
  ) {
    return true;
  }

  if (berkas.uploadedById === userId) {
    return true;
  }

  if (berkas.skripsi?.mahasiswaId === userId) {
    return true;
  }

  const assignedDosen = berkas.skripsi?.dosenSkripsi?.some(
    (item) => item.dosenId === userId && item.isActive
  );

  if (assignedDosen) {
    return true;
  }

  return false;
}

export async function downloadBerkas(req, res, next) {
  try {
    const { id } = req.params;

    const berkas = await prisma.berkas.findUnique({
      where: { id },
      include: {
        skripsi: {
          include: {
            dosenSkripsi: true
          }
        }
      }
    });

    if (!berkas) {
      return res.status(404).json({
        success: false,
        message: "Berkas tidak ditemukan"
      });
    }

    const allowed = await canAccessBerkas(req.user.id, berkas);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke berkas ini"
      });
    }

    const absolutePath = resolveFilePath(berkas.path);

    if (!absolutePath || !fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        message: "File fisik tidak ditemukan di server"
      });
    }

    res.setHeader("Content-Type", berkas.mimeType || "application/octet-stream");

    return res.download(absolutePath, berkas.originalName);
  } catch (error) {
    return next(error);
  }
}