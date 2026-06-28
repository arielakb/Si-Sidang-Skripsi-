import { prisma } from "../../config/prisma.js";

const allowedSortFields = {
  tanggal: "tanggal",
  waktuMulai: "waktuMulai",
  status: "status",
  createdAt: "createdAt"
};

export async function getPublicJadwalSidang(req, res, next) {
  try {
    const {
      search = "",
      jenisSkripsi = "",
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

    const where = {
      status: {
        in: ["DIJADWALKAN", "BERLANGSUNG", "SELESAI"]
      },
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
                  dosenSkripsi: {
                    some: {
                      dosen: {
                        name: {
                          contains: search,
                          mode: "insensitive"
                        }
                      }
                    }
                  }
                }
              }
            ]
          }
        : {})
    };

    const [total, rows] = await prisma.$transaction([
      prisma.jadwalSidang.count({ where }),
      prisma.jadwalSidang.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [selectedSortBy]: selectedSortOrder
        },
        include: {
          ruang: true,
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
        }
      })
    ]);

    return res.json({
      success: true,
      data: rows,
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
      include: {
        ruang: true,
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