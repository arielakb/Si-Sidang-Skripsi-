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

async function ensureOwner(skripsiId, userId) {
  const skripsi = await prisma.skripsi.findUnique({
    where: { id: skripsiId },
    include: {
      mahasiswa: true,
      berkas: true
    }
  });

  if (!skripsi) {
    return { error: "NOT_FOUND" };
  }

  if (skripsi.mahasiswaId !== userId) {
    return { error: "FORBIDDEN" };
  }

  return { skripsi };
}

export async function uploadFinalSkripsi(req, res, next) {
  try {
    const { skripsiId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File final skripsi wajib diupload"
      });
    }

    const { error, skripsi } = await ensureOwner(skripsiId, req.user.id);

    if (error === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    if (error === "FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke skripsi ini"
      });
    }

    if (!["MENUNGGU_FINAL", "MENUNGGU_PENGESAHAN"].includes(skripsi.status)) {
      return res.status(400).json({
        success: false,
        message: "Upload final hanya bisa dilakukan setelah revisi disetujui"
      });
    }

    const filePayload = getUploadedFilePayload(req.file);

    const berkas = await prisma.berkas.create({
      data: {
        skripsiId,
        uploadedById: req.user.id,
        kategori: "FINAL_SKRIPSI",
        status: "DIAJUKAN",
        ...filePayload
      }
    });

    await prisma.skripsi.update({
      where: { id: skripsiId },
      data: {
        status: "MENUNGGU_PENGESAHAN"
      }
    });

    const ketuaProdiUsers = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        userRoles: {
          some: {
            role: {
              slug: "ketua_prodi"
            }
          }
        }
      }
    });

    for (const user of ketuaProdiUsers) {
      await createNotification({
        userId: user.id,
        title: "Berkas Final Menunggu Pengesahan",
        message: `${skripsi.mahasiswa.name} telah mengupload berkas final skripsi.`,
        type: "FINAL_UPLOAD",
        entityType: "skripsi",
        entityId: skripsi.id
      });
    }

    return res.status(201).json({
      success: true,
      message: "Berkas final skripsi berhasil diupload",
      data: berkas
    });
  } catch (error) {
    return next(error);
  }
}

export async function uploadLembarPengesahan(req, res, next) {
  try {
    const { skripsiId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File lembar pengesahan wajib diupload"
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

    const filePayload = getUploadedFilePayload(req.file);

    const berkas = await prisma.berkas.create({
      data: {
        skripsiId,
        uploadedById: req.user.id,
        kategori: "LEMBAR_PENGESAHAN",
        status: "DISETUJUI",
        ...filePayload
      }
    });

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Lembar Pengesahan Diupload",
      message: "Lembar pengesahan skripsi Anda telah diupload.",
      type: "PENGESAHAN_UPLOAD",
      entityType: "skripsi",
      entityId: skripsi.id
    });

    return res.status(201).json({
      success: true,
      message: "Lembar pengesahan berhasil diupload",
      data: berkas
    });
  } catch (error) {
    return next(error);
  }
}

export async function approveFinalSkripsi(req, res, next) {
  try {
    const { skripsiId } = req.params;
    const { catatan } = req.body;

    const skripsi = await prisma.skripsi.findUnique({
      where: { id: skripsiId },
      include: {
        mahasiswa: true,
        berkas: true
      }
    });

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    const finalFile = skripsi.berkas.find(
      (item) => item.kategori === "FINAL_SKRIPSI" && item.status === "DIAJUKAN"
    );

    if (!finalFile) {
      return res.status(400).json({
        success: false,
        message: "Berkas final skripsi belum diupload atau sudah diproses"
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.berkas.update({
        where: { id: finalFile.id },
        data: {
          status: "DISETUJUI",
          reviewedById: req.user.id,
          reviewedAt: new Date(),
          catatan
        }
      });

      const pengesahan = await tx.pengesahan.create({
        data: {
          skripsiId,
          approvedById: req.user.id,
          approvedAt: new Date(),
          catatan
        }
      });

      const updatedSkripsi = await tx.skripsi.update({
        where: { id: skripsiId },
        data: {
          status: "SELESAI",
          finalApprovedAt: new Date()
        }
      });

      return {
        skripsi: updatedSkripsi,
        pengesahan
      };
    });

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Skripsi Selesai",
      message: "Berkas final skripsi Anda telah disahkan. Proses skripsi selesai.",
      type: "SKRIPSI_SELESAI",
      entityType: "skripsi",
      entityId: skripsi.id
    });

    return res.json({
      success: true,
      message: "Skripsi berhasil disahkan dan dinyatakan selesai",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

export async function rejectFinalSkripsi(req, res, next) {
  try {
    const { skripsiId } = req.params;
    const { alasan } = req.body;

    if (!alasan) {
      return res.status(400).json({
        success: false,
        message: "Alasan penolakan wajib diisi"
      });
    }

    const skripsi = await prisma.skripsi.findUnique({
      where: { id: skripsiId },
      include: {
        mahasiswa: true,
        berkas: true
      }
    });

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    const finalFile = skripsi.berkas.find(
      (item) => item.kategori === "FINAL_SKRIPSI" && item.status === "DIAJUKAN"
    );

    if (!finalFile) {
      return res.status(400).json({
        success: false,
        message: "Berkas final skripsi belum diupload atau sudah diproses"
      });
    }

    await prisma.$transaction([
      prisma.berkas.update({
        where: { id: finalFile.id },
        data: {
          status: "DITOLAK",
          reviewedById: req.user.id,
          reviewedAt: new Date(),
          catatan: alasan
        }
      }),
      prisma.skripsi.update({
        where: { id: skripsiId },
        data: {
          status: "MENUNGGU_FINAL"
        }
      })
    ]);

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Berkas Final Ditolak",
      message: alasan,
      type: "FINAL_REJECTED",
      entityType: "skripsi",
      entityId: skripsi.id
    });

    return res.json({
      success: true,
      message: "Berkas final berhasil ditolak",
      data: {
        alasan
      }
    });
  } catch (error) {
    return next(error);
  }
}