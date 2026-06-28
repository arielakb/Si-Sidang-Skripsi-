import { prisma } from "../../config/prisma.js";
import { createNotification } from "../../utils/notification.js";

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

async function checkRoomScheduleConflict({ ruangId, waktuMulai, waktuSelesai, excludeJadwalId }) {
  if (!ruangId) return null;

  return prisma.jadwalSidang.findFirst({
    where: {
      ruangId,
      status: {
        in: ["DIJADWALKAN", "BERLANGSUNG"]
      },
      ...(excludeJadwalId
        ? {
            id: {
              not: excludeJadwalId
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
}

async function checkRoomBorrowingConflict({ ruangId, waktuMulai, waktuSelesai }) {
  if (!ruangId) return null;

  return prisma.peminjamanRuang.findFirst({
    where: {
      ruangId,
      status: "DISETUJUI",
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
}

export async function getJadwalSidang(req, res, next) {
  try {
    const {
      page = "1",
      limit = "10",
      status = "",
      search = ""
    } = req.query;

    const currentPage = Math.max(Number(page), 1);
    const pageSize = Math.min(Math.max(Number(limit), 1), 50);
    const skip = (currentPage - 1) * pageSize;

    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              {
                skripsi: {
                  title: {
                    contains: search,
                    mode: "insensitive"
                  }
                }
              },
              {
                skripsi: {
                  mahasiswa: {
                    name: {
                      contains: search,
                      mode: "insensitive"
                    }
                  }
                }
              }
            ]
          }
        : {})
    };

    const [total, data] = await prisma.$transaction([
      prisma.jadwalSidang.count({ where }),
      prisma.jadwalSidang.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          tanggal: "asc"
        },
        include: {
          ruang: true,
          dibuatOleh: {
            select: {
              id: true,
              identifier: true,
              name: true
            }
          },
          skripsi: {
            include: {
              mahasiswa: {
                select: {
                  id: true,
                  identifier: true,
                  name: true,
                  email: true
                }
              },
              peminatan: true,
              jenisSkripsi: true,
              dosenSkripsi: {
                where: {
                  isActive: true
                },
                include: {
                  dosen: {
                    select: {
                      id: true,
                      identifier: true,
                      name: true,
                      email: true
                    }
                  }
                }
              }
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

export async function getJadwalSidangDetail(req, res, next) {
  try {
    const { id } = req.params;

    const data = await prisma.jadwalSidang.findUnique({
      where: { id },
      include: {
        ruang: true,
        dibuatOleh: {
          select: {
            id: true,
            identifier: true,
            name: true
          }
        },
        skripsi: {
          include: {
            mahasiswa: {
              select: {
                id: true,
                identifier: true,
                name: true,
                email: true
              }
            },
            peminatan: true,
            jenisSkripsi: true,
            dosenSkripsi: {
              where: {
                isActive: true
              },
              include: {
                dosen: {
                  select: {
                    id: true,
                    identifier: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Jadwal sidang tidak ditemukan"
      });
    }

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function createJadwalSidang(req, res, next) {
  try {
    const {
      skripsiId,
      ruangId,
      tanggal,
      waktuMulai,
      waktuSelesai,
      tempatManual,
      linkVicon,
      pengujiIds = []
    } = req.body;

    if (!skripsiId || !tanggal || !waktuMulai || !waktuSelesai) {
      return res.status(400).json({
        success: false,
        message: "Skripsi, tanggal, waktu mulai, dan waktu selesai wajib diisi"
      });
    }

    const parsedWaktuMulai = normalizeDate(waktuMulai);
    const parsedWaktuSelesai = normalizeDate(waktuSelesai);

    if (parsedWaktuSelesai <= parsedWaktuMulai) {
      return res.status(400).json({
        success: false,
        message: "Waktu selesai harus lebih besar dari waktu mulai"
      });
    }

    const skripsi = await prisma.skripsi.findUnique({
      where: { id: skripsiId },
      include: {
        mahasiswa: true,
        dosenSkripsi: {
          where: { isActive: true },
          include: {
            dosen: true
          }
        }
      }
    });

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    if (skripsi.status !== "MENUNGGU_JADWAL") {
      return res.status(400).json({
        success: false,
        message: "Jadwal hanya bisa dibuat untuk skripsi dengan status MENUNGGU_JADWAL"
      });
    }

    if (ruangId) {
      const ruang = await prisma.masterRuang.findUnique({
        where: { id: ruangId }
      });

      if (!ruang || !ruang.isActive) {
        return res.status(404).json({
          success: false,
          message: "Ruang tidak ditemukan atau tidak aktif"
        });
      }

      const jadwalConflict = await checkRoomScheduleConflict({
        ruangId,
        waktuMulai: parsedWaktuMulai,
        waktuSelesai: parsedWaktuSelesai
      });

      if (jadwalConflict) {
        return res.status(409).json({
          success: false,
          message: "Ruang sudah digunakan untuk jadwal sidang lain pada waktu tersebut"
        });
      }

      const borrowingConflict = await checkRoomBorrowingConflict({
        ruangId,
        waktuMulai: parsedWaktuMulai,
        waktuSelesai: parsedWaktuSelesai
      });

      if (borrowingConflict) {
        return res.status(409).json({
          success: false,
          message: "Ruang sudah disetujui untuk peminjaman lain pada waktu tersebut"
        });
      }
    }

    if (pengujiIds.length > 0) {
      const pengujiUsers = await prisma.user.findMany({
        where: {
          id: {
            in: pengujiIds
          },
          status: "ACTIVE",
          userRoles: {
            some: {
              role: {
                slug: {
                  in: ["dosen_penguji", "dosen_pembimbing", "dosen_koordinator"]
                }
              }
            }
          }
        }
      });

      if (pengujiUsers.length !== pengujiIds.length) {
        return res.status(400).json({
          success: false,
          message: "Sebagian penguji tidak valid atau tidak memiliki role dosen"
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      if (pengujiIds.length > 0) {
        await tx.skripsiDosen.createMany({
          data: pengujiIds.map((dosenId) => ({
            skripsiId,
            dosenId,
            peran: "PENGUJI",
            assignedById: req.user.id
          })),
          skipDuplicates: true
        });
      }

      const jadwal = await tx.jadwalSidang.create({
        data: {
          skripsiId,
          ruangId: ruangId || null,
          dibuatOlehId: req.user.id,
          tanggal: new Date(tanggal),
          waktuMulai: parsedWaktuMulai,
          waktuSelesai: parsedWaktuSelesai,
          tempatManual,
          linkVicon,
          status: "DIJADWALKAN"
        },
        include: {
          ruang: true,
          skripsi: {
            include: {
              mahasiswa: true,
              dosenSkripsi: {
                where: { isActive: true },
                include: {
                  dosen: true
                }
              }
            }
          }
        }
      });

      await tx.skripsi.update({
        where: { id: skripsiId },
        data: {
          status: "SIAP_SIDANG"
        }
      });

      return jadwal;
    });

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Jadwal Sidang Telah Ditentukan",
      message: "Jadwal sidang Anda telah ditentukan oleh koordinator.",
      type: "JADWAL_SIDANG",
      entityType: "jadwal_sidang",
      entityId: result.id
    });

    for (const assignment of result.skripsi.dosenSkripsi) {
      await createNotification({
        userId: assignment.dosenId,
        title: "Jadwal Sidang Baru",
        message: `Anda terlibat dalam jadwal sidang mahasiswa ${skripsi.mahasiswa.name}.`,
        type: "JADWAL_SIDANG",
        entityType: "jadwal_sidang",
        entityId: result.id
      });
    }

    return res.status(201).json({
      success: true,
      message: "Jadwal sidang berhasil dibuat",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateJadwalSidangStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["DIJADWALKAN", "BERLANGSUNG", "SELESAI", "DIBATALKAN"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status jadwal tidak valid"
      });
    }

    const jadwal = await prisma.jadwalSidang.update({
      where: { id },
      data: { status },
      include: {
        skripsi: {
          include: {
            mahasiswa: true
          }
        }
      }
    });

    if (status === "BERLANGSUNG") {
      await prisma.skripsi.update({
        where: { id: jadwal.skripsiId },
        data: {
          status: "EVALUASI_SIDANG"
        }
      });
    }

    if (status === "SELESAI") {
      await prisma.skripsi.update({
        where: { id: jadwal.skripsiId },
        data: {
          status: "MENUNGGU_REVISI"
        }
      });
    }

    await createNotification({
      userId: jadwal.skripsi.mahasiswaId,
      title: "Status Jadwal Sidang Diperbarui",
      message: `Status jadwal sidang Anda berubah menjadi ${status}.`,
      type: "JADWAL_STATUS",
      entityType: "jadwal_sidang",
      entityId: jadwal.id
    });

    return res.json({
      success: true,
      message: "Status jadwal sidang berhasil diperbarui",
      data: jadwal
    });
  } catch (error) {
    return next(error);
  }
}