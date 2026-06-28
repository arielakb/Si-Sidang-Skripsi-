import { prisma } from "../../config/prisma.js";
import { createNotification } from "../../utils/notification.js";

async function hasRoomConflict({ ruangId, waktuMulai, waktuSelesai, excludeBorrowingId }) {
  const sidangConflict = await prisma.jadwalSidang.findFirst({
    where: {
      ruangId,
      status: {
        in: ["DIJADWALKAN", "BERLANGSUNG"]
      },
      AND: [
        {
          waktuMulai: {
            lt: waktuSelesai
          }
        },
        {
          waktuSelesai: {
            gt: waktuMulai
          }
        }
      ]
    }
  });

  if (sidangConflict) {
    return {
      conflict: true,
      source: "JADWAL_SIDANG"
    };
  }

  const borrowingConflict = await prisma.peminjamanRuang.findFirst({
    where: {
      ruangId,
      status: "DISETUJUI",
      ...(excludeBorrowingId
        ? {
            id: {
              not: excludeBorrowingId
            }
          }
        : {}),
      AND: [
        {
          waktuMulai: {
            lt: waktuSelesai
          }
        },
        {
          waktuSelesai: {
            gt: waktuMulai
          }
        }
      ]
    }
  });

  if (borrowingConflict) {
    return {
      conflict: true,
      source: "PEMINJAMAN_RUANG"
    };
  }

  return {
    conflict: false,
    source: null
  };
}

export async function getPeminjamanRuang(req, res, next) {
  try {
    const {
      status = "",
      page = "1",
      limit = "10"
    } = req.query;

    const currentPage = Math.max(Number(page), 1);
    const pageSize = Math.min(Math.max(Number(limit), 1), 50);
    const skip = (currentPage - 1) * pageSize;

    const where = {
      ...(status ? { status } : {})
    };

    const [total, data] = await prisma.$transaction([
      prisma.peminjamanRuang.count({ where }),
      prisma.peminjamanRuang.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: "desc"
        },
        include: {
          mahasiswa: {
            select: {
              id: true,
              identifier: true,
              name: true,
              email: true
            }
          },
          ruang: true,
          skripsi: {
            select: {
              id: true,
              title: true,
              status: true,
              tahap: true
            }
          },
          reviewedBy: {
            select: {
              id: true,
              identifier: true,
              name: true
            }
          }
        }
      })
    ]);

    return res.json({
      success: true,
      data,
      meta: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMyPeminjamanRuang(req, res, next) {
  try {
    const data = await prisma.peminjamanRuang.findMany({
      where: {
        mahasiswaId: req.user.id
      },
      include: {
        ruang: true,
        skripsi: {
          select: {
            id: true,
            title: true,
            tahap: true,
            status: true
          }
        },
        reviewedBy: {
          select: {
            id: true,
            name: true
          }
        }
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

export async function createPeminjamanRuang(req, res, next) {
  try {
    const {
      skripsiId,
      ruangId,
      tanggal,
      waktuMulai,
      waktuSelesai,
      keperluan
    } = req.body;

    if (!ruangId || !tanggal || !waktuMulai || !waktuSelesai || !keperluan) {
      return res.status(400).json({
        success: false,
        message: "Ruang, tanggal, waktu mulai, waktu selesai, dan keperluan wajib diisi"
      });
    }

    const parsedWaktuMulai = new Date(waktuMulai);
    const parsedWaktuSelesai = new Date(waktuSelesai);

    if (parsedWaktuSelesai <= parsedWaktuMulai) {
      return res.status(400).json({
        success: false,
        message: "Waktu selesai harus lebih besar dari waktu mulai"
      });
    }

    const ruang = await prisma.masterRuang.findUnique({
      where: { id: ruangId }
    });

    if (!ruang || !ruang.isActive) {
      return res.status(404).json({
        success: false,
        message: "Ruang tidak ditemukan atau tidak aktif"
      });
    }

    if (skripsiId) {
      const skripsi = await prisma.skripsi.findUnique({
        where: { id: skripsiId }
      });

      if (!skripsi) {
        return res.status(404).json({
          success: false,
          message: "Skripsi tidak ditemukan"
        });
      }

      if (skripsi.mahasiswaId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Anda tidak memiliki akses ke skripsi ini"
        });
      }
    }

    const conflict = await hasRoomConflict({
      ruangId,
      waktuMulai: parsedWaktuMulai,
      waktuSelesai: parsedWaktuSelesai
    });

    if (conflict.conflict) {
      return res.status(409).json({
        success: false,
        message:
          conflict.source === "JADWAL_SIDANG"
            ? "Ruang sudah digunakan untuk jadwal sidang pada waktu tersebut"
            : "Ruang sudah dipinjam pada waktu tersebut"
      });
    }

    const data = await prisma.peminjamanRuang.create({
      data: {
        skripsiId: skripsiId || null,
        mahasiswaId: req.user.id,
        ruangId,
        tanggal: new Date(tanggal),
        waktuMulai: parsedWaktuMulai,
        waktuSelesai: parsedWaktuSelesai,
        keperluan,
        status: "DIAJUKAN"
      },
      include: {
        ruang: true
      }
    });

    const stafUsers = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        userRoles: {
          some: {
            role: {
              slug: "staf_prodi"
            }
          }
        }
      }
    });

    for (const staf of stafUsers) {
      await createNotification({
        userId: staf.id,
        title: "Pengajuan Peminjaman Ruang",
        message: `${req.user.name} mengajukan peminjaman ruang ${ruang.name}.`,
        type: "PEMINJAMAN_RUANG",
        entityType: "peminjaman_ruang",
        entityId: data.id
      });
    }

    return res.status(201).json({
      success: true,
      message: "Pengajuan peminjaman ruang berhasil dibuat",
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function approvePeminjamanRuang(req, res, next) {
  try {
    const { id } = req.params;

    const peminjaman = await prisma.peminjamanRuang.findUnique({
      where: { id },
      include: {
        ruang: true,
        mahasiswa: true
      }
    });

    if (!peminjaman) {
      return res.status(404).json({
        success: false,
        message: "Peminjaman ruang tidak ditemukan"
      });
    }

    if (peminjaman.status !== "DIAJUKAN") {
      return res.status(400).json({
        success: false,
        message: "Hanya pengajuan dengan status DIAJUKAN yang bisa disetujui"
      });
    }

    const conflict = await hasRoomConflict({
      ruangId: peminjaman.ruangId,
      waktuMulai: peminjaman.waktuMulai,
      waktuSelesai: peminjaman.waktuSelesai,
      excludeBorrowingId: peminjaman.id
    });

    if (conflict.conflict) {
      return res.status(409).json({
        success: false,
        message: "Ruang sudah tidak tersedia pada waktu tersebut"
      });
    }

    const updated = await prisma.peminjamanRuang.update({
      where: { id },
      data: {
        status: "DISETUJUI",
        reviewedById: req.user.id,
        reviewedAt: new Date()
      },
      include: {
        ruang: true
      }
    });

    await createNotification({
      userId: peminjaman.mahasiswaId,
      title: "Peminjaman Ruang Disetujui",
      message: `Peminjaman ruang ${peminjaman.ruang.name} telah disetujui.`,
      type: "PEMINJAMAN_DISETUJUI",
      entityType: "peminjaman_ruang",
      entityId: peminjaman.id
    });

    return res.json({
      success: true,
      message: "Peminjaman ruang berhasil disetujui",
      data: updated
    });
  } catch (error) {
    return next(error);
  }
}

export async function rejectPeminjamanRuang(req, res, next) {
  try {
    const { id } = req.params;
    const { alasan } = req.body;

    if (!alasan) {
      return res.status(400).json({
        success: false,
        message: "Alasan penolakan wajib diisi"
      });
    }

    const peminjaman = await prisma.peminjamanRuang.findUnique({
      where: { id },
      include: {
        ruang: true
      }
    });

    if (!peminjaman) {
      return res.status(404).json({
        success: false,
        message: "Peminjaman ruang tidak ditemukan"
      });
    }

    if (peminjaman.status !== "DIAJUKAN") {
      return res.status(400).json({
        success: false,
        message: "Hanya pengajuan dengan status DIAJUKAN yang bisa ditolak"
      });
    }

    const updated = await prisma.peminjamanRuang.update({
      where: { id },
      data: {
        status: "DITOLAK",
        alasan,
        reviewedById: req.user.id,
        reviewedAt: new Date()
      },
      include: {
        ruang: true
      }
    });

    await createNotification({
      userId: peminjaman.mahasiswaId,
      title: "Peminjaman Ruang Ditolak",
      message: alasan,
      type: "PEMINJAMAN_DITOLAK",
      entityType: "peminjaman_ruang",
      entityId: peminjaman.id
    });

    return res.json({
      success: true,
      message: "Peminjaman ruang berhasil ditolak",
      data: updated
    });
  } catch (error) {
    return next(error);
  }
}