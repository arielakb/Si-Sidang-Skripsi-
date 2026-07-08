import { getUserRoles } from "../rbac/rbac.service.js";
import { prisma } from "../../config/prisma.js";
import { createNotification } from "../../utils/notification.js";
import {
  canRepeatSeminarProposal,
  getActiveSidang,
  getAssignedPengujiCount,
  getLatestSidang,
  getNextAttemptNo,
  getWorkflowRuleInt,
  getWorkflowRuleStringList,
  isSidangPenguji,
  syncSidangReadinessStatus
} from "./sidang.service.js";

const ACTIVE_SIDANG_STATUSES = [
  "DRAFT",
  "MENUNGGU_BERKAS",
  "MENUNGGU_PENGUJI",
  "MENUNGGU_JADWAL",
  "DIJADWALKAN",
  "BERLANGSUNG",
  "MENUNGGU_NILAI",
  "MENUNGGU_KEPUTUSAN"
];

const ALLOWED_HASIL_BY_JENIS = {
  SEMINAR_PROPOSAL: ["LOLOS", "TIDAK_LOLOS", "REVISI", "ULANG"],
  SEMINAR_HASIL: ["LOLOS", "TIDAK_LOLOS", "REVISI", "ULANG"],
  SIDANG_KOMPRE: ["LOLOS", "TIDAK_LOLOS", "REVISI", "ULANG"],
  SIDANG_AKHIR: ["LULUS", "TIDAK_LULUS"]
};

function getUploadedFilePayload(file) {
  return {
    originalName: file.originalname,
    fileName: file.filename,
    mimeType: file.mimetype,
    sizeBytes: BigInt(file.size),
    path: file.path
  };
}

function canManageFinalDecision(roles) {
  return (
    roles.includes("admin") ||
    roles.includes("ketua_prodi") ||
    roles.includes("dosen_koordinator")
  );
}


function canReviewRevisiSidang(roles) {
  return (
    roles.includes("admin") ||
    roles.includes("ketua_prodi") ||
    roles.includes("dosen_koordinator")
  );
}

async function ensureKompreAfterSemhasRevisiApproved(tx, sidang, userId) {
  const activeKompre = await tx.sidang.findFirst({
    where: {
      skripsiId: sidang.skripsiId,
      jenis: "SIDANG_KOMPRE",
      status: {
        in: ACTIVE_SIDANG_STATUSES
      }
    }
  });

  const latestKompre = await tx.sidang.findFirst({
    where: {
      skripsiId: sidang.skripsiId,
      jenis: "SIDANG_KOMPRE"
    },
    orderBy: {
      attemptNo: "desc"
    }
  });

  if (!activeKompre && latestKompre?.hasil !== "LOLOS") {
    await tx.sidang.create({
      data: {
        skripsiId: sidang.skripsiId,
        jenis: "SIDANG_KOMPRE",
        attemptNo: Number(latestKompre?.attemptNo ?? 0) + 1,
        status: "MENUNGGU_PENGUJI",
        createdById: userId
      }
    });
  }

  await tx.skripsi.update({
    where: {
      id: sidang.skripsiId
    },
    data: {
      tahap: "SIDANG_SKRIPSI",
      status: "MENUNGGU_KOMPRE"
    }
  });
}


function parseWorkflowDateTime(tanggal, waktu) {
  const cleanTanggal = String(tanggal || "").trim();
  const cleanWaktu = String(waktu || "").trim();

  if (!cleanWaktu) return null;

  if (cleanWaktu.includes("T")) {
    const parsed = new Date(cleanWaktu);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (cleanTanggal && /^\d{2}:\d{2}(:\d{2})?$/.test(cleanWaktu)) {
    const normalizedTime = cleanWaktu.length === 5 ? `${cleanWaktu}:00` : cleanWaktu;
    const parsed = new Date(`${cleanTanggal}T${normalizedTime}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(cleanWaktu);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseWorkflowDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDefaultRequiredBerkas(jenis) {
  if (jenis === "SEMINAR_PROPOSAL") {
    return ["PROPOSAL", "PRESENTASI"];
  }

  if (jenis === "SEMINAR_HASIL") {
    return ["SIDANG_SOFTCOPY", "SIDANG_PRESENTASI"];
  }

  if (jenis === "SIDANG_AKHIR") {
    return ["FINAL_SKRIPSI"];
  }

  return [];
}

async function getMissingRequiredBerkas(sidang) {
  const requiredBerkas = await getWorkflowRuleStringList(
    sidang.jenis,
    "REQUIRED_BERKAS",
    getDefaultRequiredBerkas(sidang.jenis)
  );

  if (requiredBerkas.length === 0) {
    return [];
  }

  const uploadedBerkas = await prisma.berkas.findMany({
    where: {
      sidangId: sidang.id,
      kategori: {
        in: requiredBerkas
      },
      status: {
        not: "DITOLAK"
      }
    },
    select: {
      kategori: true
    }
  });

  const uploadedKategori = new Set(uploadedBerkas.map((item) => item.kategori));

  return requiredBerkas.filter((kategori) => !uploadedKategori.has(kategori));
}

async function getSidangDetailById(id) {
  return prisma.sidang.findUnique({
    where: { id },
    include: {
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
          jenisSkripsi: true
        }
      },
      dosen: {
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
      jadwalSidang: {
        include: {
          ruang: true
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      berkas: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });
}

export async function getSidangList(req, res, next) {
  try {
    const {
      jenis = "",
      status = "",
      search = "",
      page = "1",
      limit = "20"
    } = req.query;

    const roles = await getUserRoles(req.user.id);

    const currentPage = Math.max(Number(page), 1);
    const pageSize = Math.min(Math.max(Number(limit), 1), 100);
    const skip = (currentPage - 1) * pageSize;

    const baseWhere = {
      ...(jenis ? { jenis } : {}),
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
              },
              {
                skripsi: {
                  mahasiswa: {
                    identifier: {
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

    let accessWhere = {};

    if (roles.includes("mahasiswa")) {
      accessWhere = {
        skripsi: {
          mahasiswaId: req.user.id
        }
      };
    } else if (
      roles.includes("dosen_penguji") ||
      roles.includes("dosen_pembimbing") ||
      roles.includes("dosen_koordinator")
    ) {
      accessWhere = {
        dosen: {
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
      roles.includes("dosen_koordinator") ||
      roles.includes("staf_prodi")
    ) {
      accessWhere = {};
    }

    const where = {
      ...baseWhere,
      ...accessWhere
    };

    const [total, data] = await prisma.$transaction([
      prisma.sidang.count({ where }),
      prisma.sidang.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          {
            createdAt: "desc"
          },
          {
            attemptNo: "desc"
          }
        ],
        include: {
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
              jenisSkripsi: true
            }
          },
          dosen: {
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
          jadwalSidang: {
            include: {
              ruang: true
            },
            orderBy: {
              createdAt: "desc"
            }
          },
          berkas: {
            orderBy: {
              createdAt: "desc"
            }
          },
          nilaiSidang: {
            include: {
              dosen: {
                select: {
                  id: true,
                  identifier: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: {
              createdAt: "desc"
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

export async function getDosenPengujiOptions(req, res, next) {
  try {
    const data = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        userRoles: {
          some: {
            role: {
              slug: {
                in: [
                  "dosen_penguji",
                  "dosen_pembimbing",
                  "dosen_koordinator"
                ]
              }
            }
          }
        }
      },
      select: {
        id: true,
        identifier: true,
        name: true,
        email: true,
        userRoles: {
          include: {
            role: true
          }
        }
      },
      orderBy: {
        name: "asc"
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

export async function getSidangBySkripsi(req, res, next) {
  try {
    const { skripsiId } = req.params;

    const data = await prisma.sidang.findMany({
      where: {
        skripsiId
      },
      include: {
        dosen: {
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
        jadwalSidang: {
          include: {
            ruang: true
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        berkas: {
          orderBy: {
            createdAt: "desc"
          }
        },
        nilaiSidang: {
          include: {
            dosen: {
              select: {
                id: true,
                identifier: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: [
        {
          jenis: "asc"
        },
        {
          attemptNo: "asc"
        }
      ]
    });

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function registerSeminarProposalAttempt(req, res, next) {
  try {
    const { skripsiId } = req.body;

    if (!skripsiId) {
      return res.status(400).json({
        success: false,
        message: "Skripsi wajib dipilih"
      });
    }

    const skripsi = await prisma.skripsi.findUnique({
      where: {
        id: skripsiId
      },
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

    if (skripsi.mahasiswaId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke skripsi ini"
      });
    }

    const activeSidang = await getActiveSidang(
      skripsiId,
      "SEMINAR_PROPOSAL"
    );

    if (activeSidang) {
      return res.status(409).json({
        success: false,
        message:
          "Masih ada seminar proposal aktif. Selesaikan proses tersebut sebelum daftar ulang."
      });
    }

    const latestSidang = await getLatestSidang(
      skripsiId,
      "SEMINAR_PROPOSAL"
    );

    if (!canRepeatSeminarProposal(latestSidang)) {
      return res.status(409).json({
        success: false,
        message:
          "Seminar proposal sudah lolos sehingga tidak dapat daftar ulang."
      });
    }

    const maxAttempt = await getWorkflowRuleInt(
      "SEMINAR_PROPOSAL",
      "MAX_ATTEMPT",
      3
    );

    const attemptNo = await getNextAttemptNo(
      skripsiId,
      "SEMINAR_PROPOSAL"
    );

    if (attemptNo > maxAttempt) {
      return res.status(409).json({
        success: false,
        message: `Batas maksimal percobaan seminar proposal adalah ${maxAttempt} kali.`
      });
    }

    const sidang = await prisma.$transaction(async (tx) => {
      const created = await tx.sidang.create({
        data: {
          skripsiId,
          jenis: "SEMINAR_PROPOSAL",
          attemptNo,
          status: "MENUNGGU_BERKAS",
          createdById: req.user.id
        }
      });

      await tx.skripsi.update({
        where: {
          id: skripsiId
        },
        data: {
          tahap: "SEMINAR_PROPOSAL",
          status: "MENUNGGU_BERKAS"
        }
      });

      return created;
    });

    return res.status(201).json({
      success: true,
      message: "Attempt seminar proposal berhasil dibuat",
      data: sidang
    });
  } catch (error) {
    return next(error);
  }
}

export async function assignPengujiSidang(req, res, next) {
  try {
    const { sidangId } = req.params;
    const { dosenIds = [] } = req.body;

    const uniqueDosenIds = Array.from(new Set(dosenIds.filter(Boolean)));

    if (!Array.isArray(dosenIds) || uniqueDosenIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Minimal satu dosen penguji wajib dipilih"
      });
    }

    const sidang = await prisma.sidang.findUnique({
      where: {
        id: sidangId
      },
      include: {
        skripsi: {
          include: {
            mahasiswa: true
          }
        }
      }
    });

    if (!sidang) {
      return res.status(404).json({
        success: false,
        message: "Sidang tidak ditemukan"
      });
    }

    const missingBerkas = await getMissingRequiredBerkas(sidang);

    if (missingBerkas.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Berkas wajib belum lengkap: ${missingBerkas.join(", ")}`
      });
    }

    const minPenguji = await getWorkflowRuleInt(
      sidang.jenis,
      "MIN_PENGUJI",
      2
    );

    if (uniqueDosenIds.length < minPenguji) {
      return res.status(400).json({
        success: false,
        message: `Minimal dosen penguji untuk ${sidang.jenis} adalah ${minPenguji}.`
      });
    }

    const dosenUsers = await prisma.user.findMany({
      where: {
        id: {
          in: uniqueDosenIds
        },
        status: "ACTIVE",
        userRoles: {
          some: {
            role: {
              slug: {
                in: [
                  "dosen_penguji",
                  "dosen_pembimbing",
                  "dosen_koordinator"
                ]
              }
            }
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    if (dosenUsers.length !== uniqueDosenIds.length) {
      return res.status(400).json({
        success: false,
        message: "Sebagian dosen tidak valid atau tidak aktif"
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.sidangDosen.updateMany({
        where: {
          sidangId,
          peran: {
            in: ["PENGUJI", "KETUA_PENGUJI"]
          },
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      for (const [index, dosenId] of uniqueDosenIds.entries()) {
        const peran = index === 0 ? "KETUA_PENGUJI" : "PENGUJI";

        await tx.sidangDosen.upsert({
          where: {
            sidangId_dosenId_peran: {
              sidangId,
              dosenId,
              peran
            }
          },
          update: {
            isActive: true,
            assignedById: req.user.id,
            assignedAt: new Date()
          },
          create: {
            sidangId,
            dosenId,
            peran,
            assignedById: req.user.id
          }
        });
      }
    });

    await syncSidangReadinessStatus(sidangId);

    for (const dosen of dosenUsers) {
      await createNotification({
        userId: dosen.id,
        title: "Penugasan Penguji Sidang",
        message: `Anda ditugaskan sebagai penguji ${sidang.jenis} untuk mahasiswa ${sidang.skripsi.mahasiswa.name}.`,
        type: "SIDANG_PENGUJI",
        entityType: "sidang",
        entityId: sidang.id
      });
    }

    const updated = await getSidangDetailById(sidangId);

    return res.json({
      success: true,
      message: "Dosen penguji sidang berhasil ditetapkan",
      data: updated
    });
  } catch (error) {
    return next(error);
  }
}

export async function createJadwalSidangWorkflow(req, res, next) {
  try {
    const {
      ruangId,
      tanggal,
      waktuMulai,
      waktuSelesai,
      tempatManual,
      linkVicon
    } = req.body;
    const { sidangId } = req.params;

    if (!tanggal || !waktuMulai || !waktuSelesai) {
      return res.status(400).json({
        success: false,
        message: "Tanggal, waktu mulai, dan waktu selesai wajib diisi"
      });
    }

    if (!ruangId && !tempatManual && !linkVicon) {
      return res.status(400).json({
        success: false,
        message: "Pilih ruang, isi tempat manual, atau isi link vicon"
      });
    }

    const parsedTanggal = parseWorkflowDate(tanggal);
    const parsedWaktuMulai = parseWorkflowDateTime(tanggal, waktuMulai);
    const parsedWaktuSelesai = parseWorkflowDateTime(tanggal, waktuSelesai);

    if (!parsedTanggal || !parsedWaktuMulai || !parsedWaktuSelesai) {
      return res.status(400).json({
        success: false,
        message: "Format tanggal atau waktu tidak valid"
      });
    }

    if (parsedWaktuSelesai <= parsedWaktuMulai) {
      return res.status(400).json({
        success: false,
        message: "Waktu selesai harus lebih besar dari waktu mulai"
      });
    }

    const sidang = await prisma.sidang.findUnique({
      where: {
        id: sidangId
      },
      include: {
        skripsi: {
          include: {
            mahasiswa: true
          }
        }
      }
    });

    if (!sidang) {
      return res.status(404).json({
        success: false,
        message: "Sidang tidak ditemukan"
      });
    }

    if (["SELESAI", "DIBATALKAN"].includes(sidang.status)) {
      return res.status(400).json({
        success: false,
        message: "Jadwal tidak dapat dibuat karena sidang sudah selesai atau dibatalkan"
      });
    }

    const existingJadwal = await prisma.jadwalSidang.findFirst({
      where: {
        sidangId: sidang.id,
        status: {
          in: ["DIJADWALKAN", "BERLANGSUNG"]
        }
      }
    });

    if (existingJadwal) {
      return res.status(409).json({
        success: false,
        message: "Sidang ini sudah memiliki jadwal aktif"
      });
    }

    const missingBerkas = await getMissingRequiredBerkas(sidang);

    if (missingBerkas.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Jadwal belum bisa dibuat. Berkas wajib belum lengkap: ${missingBerkas.join(", ")}`
      });
    }

    const defaultMinPenguji = sidang.jenis === "SIDANG_AKHIR" ? 2 : 2;
    const pengujiCount = await getAssignedPengujiCount(sidangId);
    const minPenguji = await getWorkflowRuleInt(
      sidang.jenis,
      "MIN_PENGUJI",
      defaultMinPenguji
    );

    if (pengujiCount < minPenguji) {
      return res.status(400).json({
        success: false,
        message: `Jadwal belum bisa dibuat. Minimal penguji aktif adalah ${minPenguji}.`
      });
    }

    if (ruangId) {
      const ruang = await prisma.masterRuang.findUnique({
        where: {
          id: ruangId
        }
      });

      if (!ruang || !ruang.isActive) {
        return res.status(404).json({
          success: false,
          message: "Ruang tidak ditemukan atau tidak aktif"
        });
      }

      const conflict = await prisma.jadwalSidang.findFirst({
        where: {
          ruangId,
          status: {
            in: ["DIJADWALKAN", "BERLANGSUNG"]
          },
          AND: [
            {
              waktuMulai: {
                lt: parsedWaktuSelesai
              }
            },
            {
              waktuSelesai: {
                gt: parsedWaktuMulai
              }
            }
          ]
        }
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: "Ruang sudah digunakan pada waktu tersebut"
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const jadwal = await tx.jadwalSidang.create({
        data: {
          skripsiId: sidang.skripsiId,
          sidangId: sidang.id,
          ruangId: ruangId || null,
          dibuatOlehId: req.user.id,
          tanggal: parsedTanggal,
          waktuMulai: parsedWaktuMulai,
          waktuSelesai: parsedWaktuSelesai,
          tempatManual: tempatManual || null,
          linkVicon: linkVicon || null,
          status: "DIJADWALKAN"
        },
        include: {
          ruang: true
        }
      });

      const nextSidangStatus =
        ["SEMINAR_HASIL", "SIDANG_KOMPRE"].includes(sidang.jenis)
          ? "MENUNGGU_NILAI"
          : "DIJADWALKAN";

      await tx.sidang.update({
        where: {
          id: sidang.id
        },
        data: {
          status: nextSidangStatus
        }
      });

      if (sidang.jenis === "SEMINAR_HASIL") {
        await tx.skripsi.update({
          where: {
            id: sidang.skripsiId
          },
          data: {
            tahap: "SIDANG_SKRIPSI",
            status: "SEMINAR_HASIL"
          }
        });
      }

      if (sidang.jenis === "SIDANG_KOMPRE") {
        await tx.skripsi.update({
          where: {
            id: sidang.skripsiId
          },
          data: {
            tahap: "SIDANG_SKRIPSI",
            status: "SIDANG_KOMPRE"
          }
        });
      }

      if (sidang.jenis === "SIDANG_AKHIR") {
        await tx.skripsi.update({
          where: {
            id: sidang.skripsiId
          },
          data: {
            tahap: "FINAL",
            status: "SIDANG_AKHIR"
          }
        });
      }

      return jadwal;
    });

    await createNotification({
      userId: sidang.skripsi.mahasiswaId,
      title: "Jadwal Sidang Telah Dibuat",
      message: `Jadwal ${sidang.jenis} Anda telah dibuat.`,
      type: "SIDANG_JADWAL",
      entityType: "sidang",
      entityId: sidang.id
    });

    return res.status(201).json({
      success: true,
      message: "Jadwal sidang workflow berhasil dibuat",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}


function parseNilaiSidangInput(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  if (numericValue < 0 || numericValue > 100) {
    return null;
  }

  return numericValue;
}

export async function inputNilaiSidangWorkflow(req, res, next) {
  try {
    const { sidangId } = req.params;
    const {
      nilai,
      bobot = 100,
      komponen = "sidang",
      catatan = ""
    } = req.body;

    const parsedNilai = parseNilaiSidangInput(nilai);
    const parsedBobot = parseNilaiSidangInput(bobot);

    if (parsedNilai === null) {
      return res.status(400).json({
        success: false,
        message: "Nilai wajib berupa angka 0 sampai 100"
      });
    }

    if (parsedBobot === null) {
      return res.status(400).json({
        success: false,
        message: "Bobot wajib berupa angka 0 sampai 100"
      });
    }

    const normalizedKomponen = String(komponen || "sidang").trim() || "sidang";

    const sidang = await prisma.sidang.findUnique({
      where: {
        id: sidangId
      },
      include: {
        skripsi: {
          include: {
            mahasiswa: true
          }
        },
        jadwalSidang: true
      }
    });

    if (!sidang) {
      return res.status(404).json({
        success: false,
        message: "Sidang tidak ditemukan"
      });
    }

    if (!["SEMINAR_HASIL", "SIDANG_KOMPRE"].includes(sidang.jenis)) {
      return res.status(400).json({
        success: false,
        message: "Input nilai hanya berlaku untuk Seminar Hasil dan Sidang Kompre"
      });
    }

    if (["SELESAI", "DIBATALKAN"].includes(sidang.status)) {
      return res.status(400).json({
        success: false,
        message: "Nilai tidak dapat diubah karena sidang sudah selesai atau dibatalkan"
      });
    }

    if (!sidang.jadwalSidang?.length) {
      return res.status(400).json({
        success: false,
        message: "Nilai belum bisa diinput karena jadwal sidang belum dibuat"
      });
    }

    const roles = await getUserRoles(req.user.id);
    const isPenguji = await isSidangPenguji(sidangId, req.user.id);
    const isAdmin = roles.includes("admin");

    if (!isPenguji && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Hanya penguji aktif pada sidang ini yang dapat menginput nilai"
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingNilai = await tx.nilaiSidang.findFirst({
        where: {
          sidangId,
          dosenId: req.user.id,
          komponen: normalizedKomponen
        }
      });

      const payload = {
        skripsiId: sidang.skripsiId,
        sidangId,
        dosenId: req.user.id,
        komponen: normalizedKomponen,
        nilai: parsedNilai,
        bobot: parsedBobot,
        catatan: catatan || null
      };

      const row = existingNilai
        ? await tx.nilaiSidang.update({
            where: {
              id: existingNilai.id
            },
            data: payload,
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
          })
        : await tx.nilaiSidang.create({
            data: payload,
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
          });

      if (["DIJADWALKAN", "BERLANGSUNG", "MENUNGGU_NILAI"].includes(sidang.status)) {
        await tx.sidang.update({
          where: {
            id: sidangId
          },
          data: {
            status: "MENUNGGU_KEPUTUSAN"
          }
        });
      }

      return row;
    });

    await createNotification({
      userId: sidang.skripsi.mahasiswaId,
      title: `Nilai ${sidang.jenis} Telah Diinput`,
      message: `Nilai ${sidang.jenis} sudah diinput oleh penguji.`,
      type: "SIDANG_NILAI",
      entityType: "sidang",
      entityId: sidang.id
    });

    return res.json({
      success: true,
      message: "Nilai sidang berhasil disimpan",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}


export async function inputHasilSidang(req, res, next) {
  try {
    const { sidangId } = req.params;
    const { hasil, catatanHasil } = req.body;

    const sidang = await prisma.sidang.findUnique({
      where: {
        id: sidangId
      },
      include: {
        skripsi: {
          include: {
            mahasiswa: true
          }
        }
      }
    });

    if (!sidang) {
      return res.status(404).json({
        success: false,
        message: "Sidang tidak ditemukan"
      });
    }

    const allowedHasil = ALLOWED_HASIL_BY_JENIS[sidang.jenis] ?? [];

    if (!allowedHasil.includes(hasil)) {
      return res.status(400).json({
        success: false,
        message: `Hasil ${sidang.jenis} tidak valid`
      });
    }

    const roles = await getUserRoles(req.user.id);
    const canManageDecision = canManageFinalDecision(roles);

    const isPenguji = await isSidangPenguji(sidangId, req.user.id);

    if (sidang.jenis === "SIDANG_AKHIR") {
      if (!isPenguji && !canManageDecision) {
        return res.status(403).json({
          success: false,
          message:
            "Hanya penguji aktif, admin, ketua prodi, atau dosen koordinator yang dapat menginput keputusan Sidang Akhir"
        });
      }
    } else if (!isPenguji && !canManageDecision) {
      return res.status(403).json({
        success: false,
        message: "Anda bukan penguji aktif pada sidang ini"
      });
    }

    if (["SEMINAR_HASIL", "SIDANG_KOMPRE"].includes(sidang.jenis)) {
      const nilaiCount = await prisma.nilaiSidang.count({
        where: {
          sidangId
        }
      });

      if (nilaiCount === 0) {
        return res.status(400).json({
          success: false,
          message: "Input nilai sidang terlebih dahulu sebelum menginput hasil"
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.sidang.update({
        where: {
          id: sidangId
        },
        data: {
          hasil,
          catatanHasil: catatanHasil || null,
          status: "SELESAI",
          decidedById: req.user.id,
          decidedAt: new Date()
        }
      });

      if (sidang.jenis === "SEMINAR_PROPOSAL") {
        if (hasil === "LOLOS") {
          await tx.skripsi.update({
            where: {
              id: sidang.skripsiId
            },
            data: {
              tahap: "KOMPRE",
              status: "MENUNGGU_PEMBIMBING",
              seminarApprovedAt: new Date()
            }
          });
        }

        if (["TIDAK_LOLOS", "ULANG"].includes(hasil)) {
          await tx.skripsi.update({
            where: {
              id: sidang.skripsiId
            },
            data: {
              tahap: "SEMINAR_PROPOSAL",
              status: "DITOLAK"
            }
          });
        }

        if (hasil === "REVISI") {
          await tx.skripsi.update({
            where: {
              id: sidang.skripsiId
            },
            data: {
              tahap: "SEMINAR_PROPOSAL",
              status: "MENUNGGU_REVISI"
            }
          });
        }
      }

      if (sidang.jenis === "SEMINAR_HASIL") {
        if (hasil === "LOLOS") {
          const activeKompre = await tx.sidang.findFirst({
            where: {
              skripsiId: sidang.skripsiId,
              jenis: "SIDANG_KOMPRE",
              status: {
                in: ACTIVE_SIDANG_STATUSES
              }
            }
          });

          const latestKompre = await tx.sidang.findFirst({
            where: {
              skripsiId: sidang.skripsiId,
              jenis: "SIDANG_KOMPRE"
            },
            orderBy: {
              attemptNo: "desc"
            }
          });

          if (!activeKompre && latestKompre?.hasil !== "LOLOS") {
            await tx.sidang.create({
              data: {
                skripsiId: sidang.skripsiId,
                jenis: "SIDANG_KOMPRE",
                attemptNo: Number(latestKompre?.attemptNo ?? 0) + 1,
                status: "MENUNGGU_PENGUJI",
                createdById: req.user.id
              }
            });
          }

          await tx.skripsi.update({
            where: {
              id: sidang.skripsiId
            },
            data: {
              tahap: "SIDANG_SKRIPSI",
              status: "MENUNGGU_KOMPRE"
            }
          });
        }

        if (["TIDAK_LOLOS", "ULANG"].includes(hasil)) {
          await tx.skripsi.update({
            where: {
              id: sidang.skripsiId
            },
            data: {
              tahap: "SIDANG_SKRIPSI",
              status: "MENUNGGU_SEMINAR_HASIL"
            }
          });
        }

        if (hasil === "REVISI") {
          await tx.revisi.create({
            data: {
              skripsiId: sidang.skripsiId,
              sidangId: sidang.id,
              dibuatOlehId: req.user.id,
              catatan:
                catatanHasil ||
                "Mahasiswa wajib mengupload revisi Seminar Hasil sebelum lanjut Sidang Kompre.",
              status: "MENUNGGU_DIAJUKAN"
            }
          });

          await tx.skripsi.update({
            where: {
              id: sidang.skripsiId
            },
            data: {
              tahap: "SIDANG_SKRIPSI",
              status: "MENUNGGU_REVISI"
            }
          });
        }
      }

      if (sidang.jenis === "SIDANG_KOMPRE") {
        if (hasil === "LOLOS") {
          const activeSidangAkhir = await tx.sidang.findFirst({
            where: {
              skripsiId: sidang.skripsiId,
              jenis: "SIDANG_AKHIR",
              status: {
                in: ACTIVE_SIDANG_STATUSES
              }
            }
          });

          const latestSidangAkhir = await tx.sidang.findFirst({
            where: {
              skripsiId: sidang.skripsiId,
              jenis: "SIDANG_AKHIR"
            },
            orderBy: {
              attemptNo: "desc"
            }
          });

          if (!activeSidangAkhir && latestSidangAkhir?.hasil !== "LULUS") {
            await tx.sidang.create({
              data: {
                skripsiId: sidang.skripsiId,
                jenis: "SIDANG_AKHIR",
                attemptNo: Number(latestSidangAkhir?.attemptNo ?? 0) + 1,
                status: "MENUNGGU_BERKAS",
                createdById: req.user.id,
                catatanHasil: catatanHasil || null
              }
            });
          }

          await tx.skripsi.update({
            where: {
              id: sidang.skripsiId
            },
            data: {
              tahap: "FINAL",
              status: "MENUNGGU_SIDANG_AKHIR"
            }
          });
        }

        if (hasil === "REVISI") {
          await tx.skripsi.update({
            where: {
              id: sidang.skripsiId
            },
            data: {
              tahap: "SIDANG_SKRIPSI",
              status: "MENUNGGU_REVISI"
            }
          });
        }

        if (["TIDAK_LOLOS", "ULANG"].includes(hasil)) {
          const latestKompre = await tx.sidang.findFirst({
            where: {
              skripsiId: sidang.skripsiId,
              jenis: "SIDANG_KOMPRE"
            },
            orderBy: {
              attemptNo: "desc"
            }
          });

          const maxAttemptRule = await tx.workflowRule.findUnique({
            where: {
              stageCode_ruleKey: {
                stageCode: "SIDANG_KOMPRE",
                ruleKey: "MAX_ATTEMPT"
              }
            }
          });

          const maxAttempt = Number(maxAttemptRule?.ruleValue ?? 3);
          const nextAttemptNo =
            Number(latestKompre?.attemptNo ?? sidang.attemptNo) + 1;

          if (nextAttemptNo <= maxAttempt) {
            await tx.sidang.create({
              data: {
                skripsiId: sidang.skripsiId,
                jenis: "SIDANG_KOMPRE",
                attemptNo: nextAttemptNo,
                status: "MENUNGGU_PENGUJI",
                createdById: req.user.id,
                catatanHasil: catatanHasil || null
              }
            });

            await tx.skripsi.update({
              where: {
                id: sidang.skripsiId
              },
              data: {
                tahap: "SIDANG_SKRIPSI",
                status: "MENUNGGU_KOMPRE"
              }
            });
          } else {
            await tx.skripsi.update({
              where: {
                id: sidang.skripsiId
              },
              data: {
                tahap: "SIDANG_SKRIPSI",
                status: "TIDAK_LULUS_SKRIPSI",
                selesaiAt: new Date()
              }
            });
          }
        }
      }

      if (sidang.jenis === "SIDANG_AKHIR") {
        if (hasil === "LULUS") {
          await tx.skripsi.update({
            where: {
              id: sidang.skripsiId
            },
            data: {
              tahap: "FINAL",
              status: "LULUS_SKRIPSI",
              selesaiAt: new Date(),
              finalApprovedAt: new Date()
            }
          });
        }

        if (hasil === "TIDAK_LULUS") {
          await tx.skripsi.update({
            where: {
              id: sidang.skripsiId
            },
            data: {
              tahap: "FINAL",
              status: "TIDAK_LULUS_SKRIPSI",
              selesaiAt: new Date()
            }
          });
        }
      }

      return row;
    });

    await createNotification({
      userId: sidang.skripsi.mahasiswaId,
      title:
        sidang.jenis === "SIDANG_AKHIR"
          ? "Keputusan Akhir Skripsi Diperbarui"
          : "Hasil Sidang Diperbarui",
      message:
        sidang.jenis === "SIDANG_AKHIR"
          ? `Keputusan akhir skripsi Anda: ${hasil}.`
          : `Hasil ${sidang.jenis} Anda: ${hasil}.`,
      type: "SIDANG_HASIL",
      entityType: "sidang",
      entityId: sidang.id
    });

    return res.json({
      success: true,
      message:
        sidang.jenis === "SIDANG_AKHIR"
          ? "Keputusan akhir berhasil disimpan"
          : "Hasil sidang berhasil disimpan",
      data: updated
    });
  } catch (error) {
    return next(error);
  }
}


export async function uploadRevisiSeminarHasilSidang(req, res, next) {
  try {
    const { sidangId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File revisi wajib diupload"
      });
    }

    const sidang = await prisma.sidang.findUnique({
      where: {
        id: sidangId
      },
      include: {
        skripsi: {
          include: {
            mahasiswa: true
          }
        },
        revisi: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!sidang) {
      return res.status(404).json({
        success: false,
        message: "Sidang tidak ditemukan"
      });
    }

    if (sidang.jenis !== "SEMINAR_HASIL" || sidang.hasil !== "REVISI") {
      return res.status(400).json({
        success: false,
        message: "Upload revisi hanya berlaku untuk Seminar Hasil dengan hasil REVISI"
      });
    }

    if (sidang.skripsi.mahasiswaId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Hanya mahasiswa pemilik skripsi yang dapat mengupload revisi"
      });
    }

    const latestRevisi = sidang.revisi?.[0] ?? null;

    if (latestRevisi?.status === "DIAJUKAN") {
      return res.status(400).json({
        success: false,
        message: "Revisi sudah diajukan dan sedang menunggu review"
      });
    }

    if (latestRevisi?.status === "DISETUJUI") {
      return res.status(400).json({
        success: false,
        message: "Revisi Seminar Hasil sudah disetujui"
      });
    }

    const filePayload = getUploadedFilePayload(req.file);

    const result = await prisma.$transaction(async (tx) => {
      const berkas = await tx.berkas.create({
        data: {
          skripsiId: sidang.skripsiId,
          sidangId: sidang.id,
          uploadedById: req.user.id,
          kategori: "REVISI_SIDANG",
          status: "DIAJUKAN",
          ...filePayload
        }
      });

      const revisi =
        latestRevisi && latestRevisi.status === "MENUNGGU_DIAJUKAN"
          ? await tx.revisi.update({
              where: {
                id: latestRevisi.id
              },
              data: {
                berkasId: berkas.id,
                status: "DIAJUKAN"
              },
              include: {
                berkas: true
              }
            })
          : await tx.revisi.create({
              data: {
                skripsiId: sidang.skripsiId,
                sidangId: sidang.id,
                dibuatOlehId: req.user.id,
                berkasId: berkas.id,
                catatan:
                  latestRevisi?.catatan ||
                  "Revisi Seminar Hasil diajukan mahasiswa.",
                status: "DIAJUKAN"
              },
              include: {
                berkas: true
              }
            });

      await tx.skripsi.update({
        where: {
          id: sidang.skripsiId
        },
        data: {
          tahap: "SIDANG_SKRIPSI",
          status: "MENUNGGU_REVISI"
        }
      });

      return revisi;
    });

    await createNotification({
      userId: sidang.decidedById || sidang.createdById || sidang.skripsi.mahasiswaId,
      title: "Revisi Seminar Hasil Diajukan",
      message: "Mahasiswa sudah mengupload revisi Seminar Hasil.",
      type: "REVISI_DIAJUKAN",
      entityType: "sidang",
      entityId: sidang.id
    });

    return res.status(201).json({
      success: true,
      message: "Revisi Seminar Hasil berhasil diajukan",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

export async function approveRevisiSeminarHasilSidang(req, res, next) {
  try {
    const { sidangId, revisiId } = req.params;
    const { status = "DISETUJUI", catatan } = req.body;

    const normalizedStatus = String(status || "DISETUJUI").toUpperCase();

    if (!["DISETUJUI", "DITOLAK"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status review revisi harus DISETUJUI atau DITOLAK"
      });
    }

    const sidang = await prisma.sidang.findUnique({
      where: {
        id: sidangId
      },
      include: {
        skripsi: {
          include: {
            mahasiswa: true
          }
        }
      }
    });

    if (!sidang) {
      return res.status(404).json({
        success: false,
        message: "Sidang tidak ditemukan"
      });
    }

    if (sidang.jenis !== "SEMINAR_HASIL" || sidang.hasil !== "REVISI") {
      return res.status(400).json({
        success: false,
        message: "Review revisi hanya berlaku untuk Seminar Hasil dengan hasil REVISI"
      });
    }

    const revisi = await prisma.revisi.findFirst({
      where: {
        id: revisiId,
        sidangId: sidang.id
      }
    });

    if (!revisi) {
      return res.status(404).json({
        success: false,
        message: "Revisi tidak ditemukan"
      });
    }

    if (revisi.status !== "DIAJUKAN") {
      return res.status(400).json({
        success: false,
        message: "Revisi belum diajukan atau sudah direview"
      });
    }

    const roles = await getUserRoles(req.user.id);
    const isPenguji = await isSidangPenguji(sidangId, req.user.id);

    if (!isPenguji && !canReviewRevisiSidang(roles)) {
      return res.status(403).json({
        success: false,
        message:
          "Hanya penguji aktif, admin, ketua prodi, atau dosen koordinator yang dapat mereview revisi"
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedRevisi = await tx.revisi.update({
        where: {
          id: revisi.id
        },
        data: {
          status: normalizedStatus,
          catatan: catatan || revisi.catatan,
          approvedById: req.user.id,
          approvedAt: new Date()
        },
        include: {
          berkas: true,
          approvedBy: {
            select: {
              id: true,
              identifier: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (normalizedStatus === "DISETUJUI") {
        if (revisi.berkasId) {
          await tx.berkas.update({
            where: {
              id: revisi.berkasId
            },
            data: {
              status: "DISETUJUI",
              reviewedById: req.user.id,
              reviewedAt: new Date(),
              catatan: catatan || null
            }
          });
        }

        await ensureKompreAfterSemhasRevisiApproved(tx, sidang, req.user.id);
      } else {
        if (revisi.berkasId) {
          await tx.berkas.update({
            where: {
              id: revisi.berkasId
            },
            data: {
              status: "DITOLAK",
              reviewedById: req.user.id,
              reviewedAt: new Date(),
              catatan: catatan || "Revisi ditolak"
            }
          });
        }

        await tx.skripsi.update({
          where: {
            id: sidang.skripsiId
          },
          data: {
            tahap: "SIDANG_SKRIPSI",
            status: "MENUNGGU_REVISI"
          }
        });
      }

      return updatedRevisi;
    });

    await createNotification({
      userId: sidang.skripsi.mahasiswaId,
      title:
        normalizedStatus === "DISETUJUI"
          ? "Revisi Seminar Hasil Disetujui"
          : "Revisi Seminar Hasil Ditolak",
      message:
        normalizedStatus === "DISETUJUI"
          ? "Revisi Seminar Hasil sudah disetujui. Proses dilanjutkan ke Sidang Kompre."
          : "Revisi Seminar Hasil ditolak. Silakan upload revisi baru.",
      type: "REVISI_REVIEW",
      entityType: "sidang",
      entityId: sidang.id
    });

    return res.json({
      success: true,
      message:
        normalizedStatus === "DISETUJUI"
          ? "Revisi Seminar Hasil disetujui"
          : "Revisi Seminar Hasil ditolak",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}


export async function uploadSuratPerjanjianSidang(req, res, next) {
  try {
    const { sidangId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File surat perjanjian wajib diupload"
      });
    }

    const sidang = await prisma.sidang.findUnique({
      where: {
        id: sidangId
      },
      include: {
        skripsi: {
          include: {
            mahasiswa: true
          }
        }
      }
    });

    if (!sidang) {
      return res.status(404).json({
        success: false,
        message: "Sidang tidak ditemukan"
      });
    }

    if (sidang.jenis !== "SEMINAR_PROPOSAL" || sidang.hasil !== "LOLOS") {
      return res.status(400).json({
        success: false,
        message:
          "Surat perjanjian hanya dapat diupload setelah seminar proposal lolos"
      });
    }

    const roles = await getUserRoles(req.user.id);
    const isPenguji = await isSidangPenguji(sidangId, req.user.id);
    const canManage = canManageFinalDecision(roles);

    if (!isPenguji && !canManage) {
      return res.status(403).json({
        success: false,
        message:
          "Hanya penguji aktif, admin, ketua prodi, atau dosen koordinator yang dapat mengupload surat perjanjian skripsi"
      });
    }

    const filePayload = getUploadedFilePayload(req.file);

    const result = await prisma.$transaction(async (tx) => {
      const berkas = await tx.berkas.create({
        data: {
          skripsiId: sidang.skripsiId,
          sidangId: sidang.id,
          uploadedById: req.user.id,
          kategori: "SURAT_PERJANJIAN",
          status: "DISETUJUI",
          ...filePayload
        }
      });

      const surat = await tx.suratPerjanjian.create({
        data: {
          skripsiId: sidang.skripsiId,
          berkasId: berkas.id,
          uploadedById: req.user.id
        },
        include: {
          berkas: true,
          uploadedBy: {
            select: {
              id: true,
              identifier: true,
              name: true
            }
          }
        }
      });

      return surat;
    });

    await createNotification({
      userId: sidang.skripsi.mahasiswaId,
      title: "Surat Perjanjian Skripsi Tersedia",
      message: "Surat perjanjian skripsi sudah diupload dan dapat diunduh.",
      type: "SURAT_PERJANJIAN",
      entityType: "sidang",
      entityId: sidang.id
    });

    return res.status(201).json({
      success: true,
      message: "Surat perjanjian berhasil diupload",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

export async function uploadBerkasSidang(req, res, next) {
  try {
    const { sidangId, kategori } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File wajib diupload"
      });
    }

    const sidang = await prisma.sidang.findUnique({
      where: {
        id: sidangId
      },
      include: {
        skripsi: {
          include: {
            mahasiswa: true
          }
        }
      }
    });

    if (!sidang) {
      return res.status(404).json({
        success: false,
        message: "Sidang tidak ditemukan"
      });
    }
    if (sidang.skripsi.mahasiswaId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses upload berkas untuk sidang ini"
      });
    }

    if (["SELESAI", "DIBATALKAN"].includes(sidang.status)) {
      return res.status(400).json({
        success: false,
        message:
          "Berkas tidak dapat diupload karena sidang sudah selesai atau dibatalkan"
      });
    }

    const allowedKategori = await getWorkflowRuleStringList(
      sidang.jenis,
      "REQUIRED_BERKAS",
      getDefaultRequiredBerkas(sidang.jenis)
    );

    if (!allowedKategori.includes(kategori)) {
      return res.status(400).json({
        success: false,
        message: `Kategori berkas tidak valid untuk ${sidang.jenis}`
      });
    }

    const filePayload = getUploadedFilePayload(req.file);

    const berkas = await prisma.berkas.create({
      data: {
        skripsiId: sidang.skripsiId,
        sidangId: sidang.id,
        uploadedById: req.user.id,
        kategori,
        status: "DIAJUKAN",
        ...filePayload
      }
    });

    const updatedSidang = await syncSidangReadinessStatus(sidang.id);

    await createNotification({
      userId: sidang.skripsi.mahasiswaId,
      title: "Berkas Sidang Diupload",
      message: `Berkas ${kategori} untuk ${sidang.jenis} berhasil diupload.`,
      type: "SIDANG_BERKAS",
      entityType: "sidang",
      entityId: sidang.id
    });

    return res.status(201).json({
      success: true,
      message: "Berkas sidang berhasil diupload",
      data: {
        berkas,
        sidang: updatedSidang
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function uploadBerkasFinalSidang(req, res, next) {
  try {
    const { sidangId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File berkas final wajib diupload"
      });
    }

    const sidang = await prisma.sidang.findUnique({
      where: {
        id: sidangId
      },
      include: {
        skripsi: {
          include: {
            mahasiswa: true
          }
        }
      }
    });

    if (!sidang) {
      return res.status(404).json({
        success: false,
        message: "Sidang tidak ditemukan"
      });
    }

    if (sidang.skripsi.mahasiswaId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses upload berkas untuk sidang ini"
      });
    }

    if (sidang.jenis !== "SIDANG_AKHIR" || sidang.hasil !== "LULUS") {
      return res.status(400).json({
        success: false,
        message:
          "Berkas final hanya dapat diupload setelah sidang akhir dinyatakan lulus"
      });
    }

    const filePayload = getUploadedFilePayload(req.file);

    const berkas = await prisma.berkas.create({
      data: {
        skripsiId: sidang.skripsiId,
        sidangId: sidang.id,
        uploadedById: req.user.id,
        kategori: "BERKAS_FINAL",
        status: "DISETUJUI",
        ...filePayload
      }
    });

    await prisma.skripsi.update({
      where: { id: sidang.skripsiId },
      data: {
        status: "LULUS_SKRIPSI",
        selesaiAt: new Date()
      }
    });

    return res.status(201).json({
      success: true,
      message: "Berkas final berhasil diupload",
      data: berkas
    });
  } catch (error) {
    return next(error);
  }
}