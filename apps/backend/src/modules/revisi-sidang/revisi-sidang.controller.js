import fs from "fs/promises";
import { prisma } from "../../config/prisma.js";
import { createNotification } from "../../utils/notification.js";

function getUploadedFilePayload(file) {
  return {
    originalName: file.originalname,
    fileName: file.filename,
    mimeType: file.mimetype,
    sizeBytes: BigInt(file.size),
    path: file.path
  };
}

async function removePhysicalFile(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Gagal menghapus file fisik: ${filePath}`, error.message);
    }
  }
}

async function isAssignedDosen(skripsiId, dosenId) {
  const assignment = await prisma.skripsiDosen.findFirst({
    where: {
      skripsiId,
      dosenId,
      isActive: true,
      peran: {
        in: ["PEMBIMBING", "PENGUJI"]
      }
    }
  });

  return Boolean(assignment);
}

export async function getRevisiBySkripsi(req, res, next) {
  try {
    const { skripsiId } = req.params;

    const data = await prisma.revisi.findMany({
      where: { skripsiId },
      include: {
        dibuatOleh: {
          select: {
            id: true,
            identifier: true,
            name: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            identifier: true,
            name: true
          }
        },
        berkas: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function createRevisiSidang(req, res, next) {
  try {
    const { skripsiId } = req.params;
    const { catatan, deadline } = req.body;

    if (!catatan) {
      return res.status(400).json({
        success: false,
        message: "Catatan revisi wajib diisi"
      });
    }

    const skripsi = await prisma.skripsi.findUnique({
      where: { id: skripsiId },
      include: {
        mahasiswa: true
      }
    });

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    const allowed = await isAssignedDosen(skripsiId, req.user.id);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "Anda bukan dosen pembimbing/penguji aktif untuk skripsi ini"
      });
    }

    const revisi = await prisma.revisi.create({
      data: {
        skripsiId,
        dibuatOlehId: req.user.id,
        catatan,
        deadline: deadline ? new Date(deadline) : null,
        status: "DIAJUKAN"
      }
    });

    await prisma.skripsi.update({
      where: { id: skripsiId },
      data: {
        status: "MENUNGGU_REVISI"
      }
    });

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Catatan Revisi Sidang",
      message: "Dosen telah menambahkan catatan revisi sidang.",
      type: "REVISI_SIDANG",
      entityType: "revisi",
      entityId: revisi.id
    });

    return res.status(201).json({
      success: true,
      message: "Catatan revisi berhasil dibuat",
      data: revisi
    });
  } catch (error) {
    return next(error);
  }
}

export async function uploadRevisiSidang(req, res, next) {
  try {
    const { revisiId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File revisi wajib diupload"
      });
    }

    const revisi = await prisma.revisi.findUnique({
      where: { id: revisiId },
      include: {
        skripsi: true
      }
    });

    if (!revisi) {
      return res.status(404).json({
        success: false,
        message: "Revisi tidak ditemukan"
      });
    }

    if (revisi.skripsi.mahasiswaId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke revisi ini"
      });
    }

    const filePayload = getUploadedFilePayload(req.file);

    const result = await prisma.$transaction(async (tx) => {
      const berkas = await tx.berkas.create({
        data: {
          skripsiId: revisi.skripsiId,
          uploadedById: req.user.id,
          kategori: "REVISI_SIDANG",
          status: "DIAJUKAN",
          ...filePayload
        }
      });

      const updatedRevisi = await tx.revisi.update({
        where: { id: revisiId },
        data: {
          berkasId: berkas.id,
          status: "DIAJUKAN"
        },
        include: {
          berkas: true
        }
      });

      return updatedRevisi;
    });

    await createNotification({
      userId: revisi.dibuatOlehId,
      title: "Revisi Sidang Diupload",
      message: "Mahasiswa telah mengupload file revisi sidang.",
      type: "REVISI_UPLOAD",
      entityType: "revisi",
      entityId: revisi.id
    });

    return res.status(201).json({
      success: true,
      message: "File revisi sidang berhasil diupload",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

export async function reviewRevisiSidang(req, res, next) {
  try {
    const { revisiId } = req.params;
    const { decision, catatan } = req.body;

    if (!["APPROVE", "TOLAK"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Decision harus APPROVE atau TOLAK"
      });
    }

    const revisi = await prisma.revisi.findUnique({
      where: { id: revisiId },
      include: {
        skripsi: true,
        berkas: true
      }
    });

    if (!revisi) {
      return res.status(404).json({
        success: false,
        message: "Revisi tidak ditemukan"
      });
    }

    const allowed = await isAssignedDosen(revisi.skripsiId, req.user.id);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "Anda bukan dosen pembimbing/penguji aktif untuk skripsi ini"
      });
    }

    if (!revisi.berkasId) {
      return res.status(400).json({
        success: false,
        message: "Mahasiswa belum mengupload file revisi"
      });
    }

    const nextStatus = decision === "APPROVE" ? "DISETUJUI" : "DITOLAK";

    const updated = await prisma.$transaction(async (tx) => {
      await tx.berkas.update({
        where: { id: revisi.berkasId },
        data: {
          status: nextStatus,
          reviewedById: req.user.id,
          reviewedAt: new Date(),
          catatan
        }
      });

      const updatedRevisi = await tx.revisi.update({
        where: { id: revisiId },
        data: {
          status: nextStatus,
          approvedById: req.user.id,
          approvedAt: new Date()
        },
        include: {
          berkas: true
        }
      });

      return updatedRevisi;
    });

    const pendingRevisi = await prisma.revisi.count({
      where: {
        skripsiId: revisi.skripsiId,
        status: {
          not: "DISETUJUI"
        }
      }
    });

    if (pendingRevisi === 0) {
      await prisma.skripsi.update({
        where: { id: revisi.skripsiId },
        data: {
          status: "MENUNGGU_FINAL"
        }
      });
    }

    await createNotification({
      userId: revisi.skripsi.mahasiswaId,
      title: decision === "APPROVE" ? "Revisi Sidang Disetujui" : "Revisi Sidang Ditolak",
      message:
        decision === "APPROVE"
          ? "Revisi sidang Anda telah disetujui."
          : catatan || "Revisi sidang Anda ditolak dan perlu diperbaiki.",
      type: "REVISI_REVIEW",
      entityType: "revisi",
      entityId: revisi.id
    });

    return res.json({
      success: true,
      message: "Review revisi berhasil disimpan",
      data: updated
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteRevisiSidangPermanent(req, res, next) {
  try {
    const { revisiId } = req.params;

    const revisi = await prisma.revisi.findUnique({
      where: { id: revisiId },
      include: {
        skripsi: true,
        berkas: true
      }
    });

    if (!revisi) {
      return res.status(404).json({
        success: false,
        message: "Revisi sidang tidak ditemukan"
      });
    }

    const approvedStatuses = ["DISETUJUI", "APPROVED", "APPROVE", "SELESAI"];

    if (approvedStatuses.includes(revisi.status)) {
      return res.status(409).json({
        success: false,
        message:
          "Revisi yang sudah disetujui tidak dapat dihapus permanen. Simpan sebagai riwayat akademik."
      });
    }

    if (revisi.skripsi?.status === "SELESAI") {
      return res.status(409).json({
        success: false,
        message:
          "Revisi tidak dapat dihapus permanen karena skripsi sudah selesai."
      });
    }

    const filePath = revisi.berkas?.path || null;

    await prisma.$transaction(async (tx) => {
      if (tx.notifikasi?.deleteMany) {
        await tx.notifikasi.deleteMany({
          where: {
            entityType: "revisi",
            entityId: revisi.id
          }
        });
      }

      await tx.revisi.delete({
        where: {
          id: revisiId
        }
      });

      if (revisi.berkasId) {
        await tx.berkas.deleteMany({
          where: {
            id: revisi.berkasId
          }
        });
      }

      const totalRevisi = await tx.revisi.count({
        where: {
          skripsiId: revisi.skripsiId
        }
      });

      const pendingRevisi = await tx.revisi.count({
        where: {
          skripsiId: revisi.skripsiId,
          status: {
            not: "DISETUJUI"
          }
        }
      });

      if (
        totalRevisi > 0 &&
        pendingRevisi === 0 &&
        revisi.skripsi.status === "MENUNGGU_REVISI"
      ) {
        await tx.skripsi.update({
          where: {
            id: revisi.skripsiId
          },
          data: {
            status: "MENUNGGU_FINAL"
          }
        });
      }
    });

    await removePhysicalFile(filePath);

    return res.json({
      success: true,
      message: "Revisi sidang berhasil dihapus permanen"
    });
  } catch (error) {
    return next(error);
  }
}