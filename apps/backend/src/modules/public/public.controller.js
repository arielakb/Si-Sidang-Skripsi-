import { prisma } from "../../config/prisma.js";

const allowedSortFields = {
  tanggal: "tanggal",
  waktuMulai: "waktuMulai",
  status: "status",
  createdAt: "createdAt"
};

const SIDANG_LABELS = {
  SEMINAR_PROPOSAL: "Seminar Proposal",
  SEMINAR_HASIL: "Seminar Hasil",
  SIDANG_KOMPRE: "Sidang Kompre",
  SIDANG_AKHIR: "Sidang Akhir"
};

const PUBLIC_JADWAL_STATUSES = ["DIJADWALKAN", "BERLANGSUNG", "SELESAI"];
const PUBLIC_SIDANG_JENIS = [
  "SEMINAR_PROPOSAL",
  "SEMINAR_HASIL",
  "SIDANG_KOMPRE",
  "SIDANG_AKHIR"
];

function buildDateRange(value) {
  if (!value) return null;

  const start = new Date(`${value}T00:00:00`);
  const end = new Date(`${value}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  end.setDate(end.getDate() + 1);

  return {
    gte: start,
    lt: end
  };
}

function getSidangLabel(jenis) {
  return SIDANG_LABELS[jenis] || "Jadwal Sidang";
}

function getRoomLabel(item) {
  return (
    item.ruang?.name ||
    item.ruang?.nama ||
    item.ruang?.code ||
    item.tempatManual ||
    item.linkVicon ||
    "Ruang belum ditentukan"
  );
}

function mapPublicJadwal(row) {
  const sidang = row.sidang || null;
  const jenisSidang = sidang?.jenis || row.skripsi?.tahap || null;
  const jenisSidangLabel = getSidangLabel(jenisSidang);

  return {
    ...row,
    jenisSidang,
    jenisSidangLabel,
    sidangStatus: sidang?.status || null,
    sidangHasil: sidang?.hasil || null,
    statusPublik: row.status,
    ruangLabel: getRoomLabel(row),
    detailUrl: `/?jadwal=${row.id}#jadwal-sidang`
  };
}

function buildPublicJadwalWhere(query) {
  const {
    search = "",
    jenisSkripsi = "",
    jenisSidang = "",
    status = "",
    tanggal = "",
    ruangId = ""
  } = query;

  const dateRange = buildDateRange(tanggal);

  const where = {
    status: {
      in: status ? [status] : PUBLIC_JADWAL_STATUSES
    },
    ...(ruangId ? { ruangId } : {}),
    ...(dateRange ? { tanggal: dateRange } : {}),
    ...(jenisSidang && PUBLIC_SIDANG_JENIS.includes(jenisSidang)
      ? {
          sidang: {
            is: {
              jenis: jenisSidang
            }
          }
        }
      : {}),
    ...(jenisSkripsi
      ? {
          skripsi: {
            jenisSkripsi: {
              slug: jenisSkripsi
            }
          }
        }
      : {}),
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
            },
            {
              ruang: {
                name: {
                  contains: search,
                  mode: "insensitive"
                }
              }
            },
            {
              ruang: {
                code: {
                  contains: search,
                  mode: "insensitive"
                }
              }
            },
            {
              tempatManual: {
                contains: search,
                mode: "insensitive"
              }
            }
          ]
        }
      : {})
  };

  return where;
}

const publicJadwalInclude = {
  ruang: true,
  sidang: {
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
              name: true
            }
          }
        }
      }
    }
  },
  skripsi: {
    include: {
      mahasiswa: {
        select: {
          id: true,
          identifier: true,
          name: true
        }
      },
      jenisSkripsi: true,
      peminatan: true,
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
};

export async function getPublicJadwalSidang(req, res, next) {
  try {
    const {
      page = "1",
      limit = "10",
      sortBy = "tanggal",
      sortOrder = "asc"
    } = req.query;

    const currentPage = Math.max(Number(page), 1);
    const pageSize = Math.min(Math.max(Number(limit), 1), 50);
    const skip = (currentPage - 1) * pageSize;

    const selectedSortBy = allowedSortFields[sortBy] || "tanggal";
    const selectedSortOrder = sortOrder === "desc" ? "desc" : "asc";
    const where = buildPublicJadwalWhere(req.query);

    const orderBy =
      selectedSortBy === "tanggal"
        ? [
            { tanggal: selectedSortOrder },
            { waktuMulai: selectedSortOrder }
          ]
        : [{ [selectedSortBy]: selectedSortOrder }];

    const [total, rows] = await prisma.$transaction([
      prisma.jadwalSidang.count({ where }),
      prisma.jadwalSidang.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: publicJadwalInclude
      })
    ]);

    return res.json({
      success: true,
      data: rows.map(mapPublicJadwal),
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

export async function getPublicJadwalSidangDetail(req, res, next) {
  try {
    const { id } = req.params;

    const data = await prisma.jadwalSidang.findUnique({
      where: { id },
      include: publicJadwalInclude
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Jadwal sidang tidak ditemukan"
      });
    }

    return res.json({
      success: true,
      data: mapPublicJadwal(data)
    });
  } catch (error) {
    return next(error);
  }
}

export async function getPublicJenisSkripsi(req, res, next) {
  try {
    const data = await prisma.jenisSkripsi.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    });

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function getPublicRuang(req, res, next) {
  try {
    const data = await prisma.masterRuang.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        {
          name: "asc"
        },
        {
          code: "asc"
        }
      ],
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        capacity: true,
        facilities: true
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
