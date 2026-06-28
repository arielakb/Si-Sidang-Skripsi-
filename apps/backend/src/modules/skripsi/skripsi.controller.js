import { prisma } from "../../config/prisma.js";
import { createNotification } from "../../utils/notification.js";
import { getUserRoles } from "../rbac/rbac.service.js";

async function isAssignedDosenPembimbing(skripsiId, dosenId) {
  const assignment = await prisma.skripsiDosen.findFirst({
    where: {
      skripsiId,
      dosenId,
      peran: "PEMBIMBING",
      isActive: true
    }
  });

  return Boolean(assignment);
}

export async function getMySkripsi(req, res, next) {
  try {
    const data = await prisma.skripsi.findMany({
      where: {
        mahasiswaId: req.user.id
      },
      include: {
        peminatan: true,
        jenisSkripsi: true,
        gamification: true,
        dosenSkripsi: {
          where: { isActive: true },
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
        },
        bimbinganLogs: {
          orderBy: {
            createdAt: "desc"
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

export async function getSkripsiDetail(req, res, next) {
  try {
    const { id } = req.params;

    const data = await prisma.skripsi.findUnique({
      where: { id },
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
        gamification: true,
        dosenSkripsi: {
          where: { isActive: true },
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
        },
        bimbinganLogs: {
          orderBy: {
            createdAt: "desc"
          }
        },
        berkas: true,
        jadwalSidang: true,
        nilaiSidang: true,
        revisi: true,
        pengesahan: true
      }
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
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

export async function assignPembimbing(req, res, next) {
  try {
    const { id } = req.params;
    const { dosenIds = [] } = req.body;

    if (!Array.isArray(dosenIds) || dosenIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Minimal satu dosen pembimbing wajib dipilih"
      });
    }

    const skripsi = await prisma.skripsi.findUnique({
      where: { id },
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

    if (!["KOMPRE", "SIDANG_SKRIPSI"].includes(skripsi.tahap)) {
      return res.status(400).json({
        success: false,
        message: "Pembimbing hanya bisa ditetapkan setelah seminar proposal disetujui"
      });
    }

    const dosenUsers = await prisma.user.findMany({
      where: {
        id: {
          in: dosenIds
        },
        status: "ACTIVE",
        userRoles: {
          some: {
            role: {
              slug: {
                in: ["dosen_pembimbing", "dosen_koordinator", "dosen_penguji"]
              }
            }
          }
        }
      }
    });

    if (dosenUsers.length !== dosenIds.length) {
      return res.status(400).json({
        success: false,
        message: "Sebagian dosen tidak valid atau tidak memiliki role dosen"
      });
    }

    await prisma.$transaction([
      prisma.skripsiDosen.updateMany({
        where: {
          skripsiId: id,
          peran: "PEMBIMBING",
          isActive: true
        },
        data: {
          isActive: false
        }
      }),
      prisma.skripsiDosen.createMany({
        data: dosenUsers.map((dosen) => ({
          skripsiId: id,
          dosenId: dosen.id,
          peran: "PEMBIMBING",
          assignedById: req.user.id,
          bobotNilai: null
        })),
        skipDuplicates: true
      }),
      prisma.skripsi.update({
        where: { id },
        data: {
          status: "MENUNGGU_BERKAS"
        }
      })
    ]);

    for (const dosen of dosenUsers) {
      await createNotification({
        userId: dosen.id,
        title: "Penugasan Dosen Pembimbing",
        message: `Anda ditugaskan sebagai dosen pembimbing untuk mahasiswa ${skripsi.mahasiswa.name}.`,
        type: "PEMBIMBING_ASSIGNMENT",
        entityType: "skripsi",
        entityId: skripsi.id
      });
    }

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Dosen Pembimbing Telah Ditentukan",
      message: "Dosen pembimbing skripsi Anda telah ditentukan.",
      type: "PEMBIMBING_ASSIGNMENT",
      entityType: "skripsi",
      entityId: skripsi.id
    });

    return res.json({
      success: true,
      message: "Dosen pembimbing berhasil ditetapkan"
    });
  } catch (error) {
    return next(error);
  }
}

export async function getBimbinganCounter(req, res, next) {
  try {
    const { id } = req.params;

    const skripsi = await prisma.skripsi.findUnique({
      where: { id },
      select: {
        id: true,
        mahasiswaId: true,
        title: true,
        tahap: true,
        status: true
      }
    });

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    const validCount = await prisma.bimbinganLog.count({
      where: {
        skripsiId: id,
        status: "DIVALIDASI"
      }
    });

    return res.json({
      success: true,
      data: {
        skripsiId: id,
        validCount,
        requiredCount: 8,
        percentage: Math.min(Math.round((validCount / 8) * 100), 100),
        canRequestSidang: validCount >= 8
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function getSkripsiList(req, res, next) {
  try {
    const {
      status = "",
      tahap = "",
      search = "",
      page = "1",
      limit = "20"
    } = req.query;

    const roles = await getUserRoles(req.user.id);

    const currentPage = Math.max(Number(page), 1);
    const pageSize = Math.min(Math.max(Number(limit), 1), 50);
    const skip = (currentPage - 1) * pageSize;

    const baseWhere = {
      ...(status ? { status } : {}),
      ...(tahap ? { tahap } : {}),
      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: "insensitive"
                }
              },
              {
                mahasiswa: {
                  name: {
                    contains: search,
                    mode: "insensitive"
                  }
                }
              },
              {
                mahasiswa: {
                  identifier: {
                    contains: search,
                    mode: "insensitive"
                  }
                }
              }
            ]
          }
        : {})
    };

    let accessWhere = {};

    if (roles.includes("mahasiswa")) {
      accessWhere = {
        mahasiswaId: req.user.id
      };
    } else if (
      roles.includes("dosen_pembimbing") ||
      roles.includes("dosen_penguji") ||
      roles.includes("dosen_koordinator")
    ) {
      accessWhere = {
        dosenSkripsi: {
          some: {
            dosenId: req.user.id,
            isActive: true
          }
        }
      };
    }

    if (
      roles.includes("admin") ||
      roles.includes("ketua_prodi") ||
      roles.includes("staf_prodi")
    ) {
      accessWhere = {};
    }

    const where = {
      ...baseWhere,
      ...accessWhere
    };

    const [total, data] = await prisma.$transaction([
      prisma.skripsi.count({ where }),
      prisma.skripsi.findMany({
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
          },
          jadwalSidang: true,
          bimbinganLogs: true,
          gamification: true
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

export async function approveMajuSidang(req, res, next) {
  try {
    const { id } = req.params;
    const { catatan } = req.body;

    const skripsi = await prisma.skripsi.findUnique({
      where: { id },
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

    const isPembimbing = await isAssignedDosenPembimbing(id, req.user.id);

    if (!isPembimbing) {
      return res.status(403).json({
        success: false,
        message: "Anda bukan dosen pembimbing aktif untuk skripsi ini"
      });
    }

    const validCount = await prisma.bimbinganLog.count({
      where: {
        skripsiId: id,
        status: "DIVALIDASI"
      }
    });

    if (validCount < 8) {
      return res.status(400).json({
        success: false,
        message: `Bimbingan valid belum mencukupi. Saat ini ${validCount}/8.`
      });
    }

    const updated = await prisma.skripsi.update({
      where: { id },
      data: {
        status: "MENUNGGU_JADWAL"
      },
      include: {
        mahasiswa: {
          select: {
            id: true,
            identifier: true,
            name: true
          }
        },
        dosenSkripsi: {
          where: {
            isActive: true
          },
          include: {
            dosen: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Disetujui Maju Sidang",
      message: "Dosen pembimbing telah menyetujui Anda untuk maju sidang.",
      type: "APPROVE_MAJU_SIDANG",
      entityType: "skripsi",
      entityId: skripsi.id
    });

    return res.json({
      success: true,
      message: "Mahasiswa berhasil disetujui untuk maju sidang",
      data: {
        ...updated,
        catatan
      }
    });
  } catch (error) {
    return next(error);
  }
}