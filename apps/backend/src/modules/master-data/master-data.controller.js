import { prisma } from "../../config/prisma.js";

function hasAnyRole(req, roles = []) {
  const userRoles = req.user?.roles ?? [];
  return roles.some((role) => userRoles.includes(role));
}

function canViewInactiveMasterData(req) {
  return hasAnyRole(req, [
    "admin",
    "dosen_koordinator",
    "ketua_prodi"
  ]);
}

export async function getPeminatan(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === "true";

    const data = await prisma.peminatan.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [
        { isActive: "desc" },
        { name: "asc" }
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

export async function getJenisSkripsi(req, res, next) {
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

export async function getRuang(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === "true";

    const data = await prisma.masterRuang.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [
        { isActive: "desc" },
        { name: "asc" }
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

export async function getGradingScales(req, res, next) {
  try {
    const data = await prisma.gradingScale.findMany({
      where: { isActive: true },
      orderBy: { minScore: "desc" }
    });

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function createPeminatan(req, res, next) {
  try {
    const { slug, name, description } = req.body;

    if (!slug || !name) {
      return res.status(400).json({
        success: false,
        message: "Slug dan nama peminatan wajib diisi"
      });
    }

    const data = await prisma.peminatan.create({
      data: {
        slug,
        name,
        description
      }
    });

    return res.status(201).json({
      success: true,
      message: "Peminatan berhasil dibuat",
      data
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Slug peminatan sudah digunakan"
      });
    }

    return next(error);
  }
}

export async function updatePeminatan(req, res, next) {
  try {
    const { id } = req.params;
    const { slug, name, description, isActive } = req.body;

    const data = await prisma.peminatan.update({
      where: { id },
      data: {
        slug,
        name,
        description,
        isActive
      }
    });

    return res.json({
      success: true,
      message: "Peminatan berhasil diperbarui",
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function deletePeminatanPermanent(req, res, next) {
  try {
    const { id } = req.params;

    const peminatan = await prisma.peminatan.findUnique({
      where: { id }
    });

    if (!peminatan) {
      return res.status(404).json({
        success: false,
        message: "Peminatan tidak ditemukan"
      });
    }

    const skripsiCount = await prisma.skripsi.count({
      where: {
        peminatanId: id
      }
    });

    if (skripsiCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Peminatan tidak dapat dihapus permanen karena sudah digunakan pada data skripsi. Gunakan Nonaktifkan."
      });
    }

    await prisma.peminatan.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: "Peminatan berhasil dihapus permanen"
    });
  } catch (error) {
    return next(error);
  }
}

export async function createRuang(req, res, next) {
  try {
    const { code, name, type, capacity, facilities } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: "Kode dan nama ruang wajib diisi"
      });
    }

    const data = await prisma.masterRuang.create({
      data: {
        code,
        name,
        type,
        capacity,
        facilities
      }
    });

    return res.status(201).json({
      success: true,
      message: "Ruang berhasil dibuat",
      data
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Kode ruang sudah digunakan"
      });
    }

    return next(error);
  }
}

export async function updateRuang(req, res, next) {
  try {
    const { id } = req.params;
    const { code, name, type, capacity, facilities, isActive } = req.body;

    const data = await prisma.masterRuang.update({
      where: { id },
      data: {
        code,
        name,
        type,
        capacity,
        facilities,
        isActive
      }
    });

    return res.json({
      success: true,
      message: "Ruang berhasil diperbarui",
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteRuangPermanent(req, res, next) {
  try {
    const { id } = req.params;

    const ruang = await prisma.masterRuang.findUnique({
      where: { id }
    });

    if (!ruang) {
      return res.status(404).json({
        success: false,
        message: "Ruang tidak ditemukan"
      });
    }

    const jadwalCount = await prisma.jadwalSidang.count({
      where: {
        ruangId: id
      }
    });

    const peminjamanCount = await prisma.peminjamanRuang.count({
      where: {
        ruangId: id
      }
    });

    if (jadwalCount > 0 || peminjamanCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Ruang tidak dapat dihapus permanen karena sudah digunakan pada jadwal sidang atau peminjaman ruang. Gunakan Nonaktifkan."
      });
    }

    await prisma.masterRuang.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: "Ruang berhasil dihapus permanen"
    });
  } catch (error) {
    return next(error);
  }
}