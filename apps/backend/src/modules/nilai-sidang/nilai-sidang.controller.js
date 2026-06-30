import { prisma } from "../../config/prisma.js";
import { createNotification } from "../../utils/notification.js";

async function isAssignedDosenSidang(skripsiId, dosenId) {
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

async function getGradeLetter(score) {
  const grade = await prisma.gradingScale.findFirst({
    where: {
      isActive: true,
      minScore: {
        lte: score
      }
    },
    orderBy: {
      minScore: "desc"
    }
  });

  return grade?.letter || null;
}

function calculateWeightedScore(rows) {
  const totalWeight = rows.reduce((sum, item) => sum + Number(item.bobot || 0), 0);

  if (totalWeight <= 0) {
    const average =
      rows.reduce((sum, item) => sum + Number(item.nilai || 0), 0) / rows.length;

    return Number(average.toFixed(2));
  }

  const weightedScore =
    rows.reduce(
      (sum, item) => sum + Number(item.nilai || 0) * Number(item.bobot || 0),
      0
    ) / totalWeight;

  return Number(weightedScore.toFixed(2));
}

export async function getNilaiSidang(req, res, next) {
  try {
    const { skripsiId } = req.params;

    const rows = await prisma.nilaiSidang.findMany({
      where: { skripsiId },
      include: {
        dosen: {
          select: {
            id: true,
            identifier: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    const nilaiAkhir = rows.length > 0 ? calculateWeightedScore(rows) : null;
    const nilaiHuruf = nilaiAkhir !== null ? await getGradeLetter(nilaiAkhir) : null;

    const totalBobot = rows.reduce(
      (sum, item) => sum + Number(item.bobot || 0),
      0
    );

    return res.json({
      success: true,
      data: {
        rows,
        summary: {
          nilaiAkhir,
          nilaiHuruf,
          jumlahInput: rows.length,
          totalBobot
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function inputNilaiSidang(req, res, next) {
  try {
    const { skripsiId } = req.params;
    const { komponen, nilai, bobot = 1, catatan } = req.body;

    if (!komponen || nilai === undefined || nilai === null) {
      return res.status(400).json({
        success: false,
        message: "Komponen dan nilai wajib diisi"
      });
    }

    const parsedNilai = Number(nilai);
    const parsedBobot = Number(bobot);

    if (parsedNilai < 0 || parsedNilai > 100) {
      return res.status(400).json({
        success: false,
        message: "Nilai harus berada di antara 0 sampai 100"
      });
    }

    if (parsedBobot <= 0) {
      return res.status(400).json({
        success: false,
        message: "Bobot harus lebih besar dari 0"
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

    const allowed = await isAssignedDosenSidang(skripsiId, req.user.id);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "Anda bukan dosen pembimbing/penguji aktif untuk skripsi ini"
      });
    }

    const existing = await prisma.nilaiSidang.findFirst({
      where: {
        skripsiId,
        dosenId: req.user.id,
        komponen
      }
    });

    const data = existing
      ? await prisma.nilaiSidang.update({
          where: { id: existing.id },
          data: {
            nilai: parsedNilai,
            bobot: parsedBobot,
            catatan
          }
        })
      : await prisma.nilaiSidang.create({
          data: {
            skripsiId,
            dosenId: req.user.id,
            komponen,
            nilai: parsedNilai,
            bobot: parsedBobot,
            catatan
          }
        });

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Nilai Sidang Diperbarui",
      message: "Dosen telah menginput atau memperbarui nilai sidang Anda.",
      type: "NILAI_SIDANG",
      entityType: "skripsi",
      entityId: skripsi.id
    });

  const rows = await prisma.nilaiSidang.findMany({
    where: {
      skripsiId
    },
    include: {
      dosen: {
        select: {
          id: true,
          identifier: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  const nilaiAkhir = rows.length > 0 ? calculateWeightedScore(rows) : null;
  const nilaiHuruf = nilaiAkhir !== null ? await getGradeLetter(nilaiAkhir) : null;
  const totalBobot = rows.reduce(
    (sum, item) => sum + Number(item.bobot || 0),
    0
  );

  return res.json({
    success: true,
    message: "Nilai sidang berhasil disimpan",
    data: {
      nilai: data,
      rows,
      summary: {
        nilaiAkhir,
        nilaiHuruf,
        jumlahInput: rows.length,
        totalBobot
      }
    }
  });
  } catch (error) {
    return next(error);
  }
}

export async function finalizeNilaiSidang(req, res, next) {
  try {
    const { skripsiId } = req.params;

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

    const rows = await prisma.nilaiSidang.findMany({
      where: { skripsiId }
    });

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Belum ada nilai sidang yang diinput"
      });
    }

    const nilaiAkhir = calculateWeightedScore(rows);
    const nilaiHuruf = await getGradeLetter(nilaiAkhir);

    const updated = await prisma.skripsi.update({
      where: { id: skripsiId },
      data: {
        nilaiAkhir,
        nilaiHuruf,
        status: "MENUNGGU_REVISI",
        sidangApprovedAt: new Date()
      }
    });

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Nilai Sidang Telah Difinalisasi",
      message: `Nilai akhir sidang Anda adalah ${nilaiAkhir}${nilaiHuruf ? ` (${nilaiHuruf})` : ""}.`,
      type: "NILAI_FINAL",
      entityType: "skripsi",
      entityId: skripsi.id
    });

    return res.json({
      success: true,
      message: "Nilai sidang berhasil difinalisasi",
      data: updated
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteNilaiSidangPermanent(req, res, next) {
  try {
    const { id } = req.params;

    const nilai = await prisma.nilaiSidang.findUnique({
      where: { id },
      include: {
        skripsi: true
      }
    });

    if (!nilai) {
      return res.status(404).json({
        success: false,
        message: "Nilai sidang tidak ditemukan"
      });
    }

    if (nilai.skripsi?.status === "SELESAI") {
      return res.status(409).json({
        success: false,
        message:
          "Nilai tidak dapat dihapus permanen karena skripsi sudah selesai."
      });
    }

    await prisma.nilaiSidang.delete({
      where: { id }
    });

    const rows = await prisma.nilaiSidang.findMany({
      where: {
        skripsiId: nilai.skripsiId
      }
    });

    if (rows.length > 0) {
      const nilaiAkhir = calculateWeightedScore(rows);
      const nilaiHuruf = await getGradeLetter(nilaiAkhir);

      await prisma.skripsi.update({
        where: {
          id: nilai.skripsiId
        },
        data: {
          nilaiAkhir,
          nilaiHuruf
        }
      });
    } else {
      await prisma.skripsi.update({
        where: {
          id: nilai.skripsiId
        },
        data: {
          nilaiAkhir: null,
          nilaiHuruf: null
        }
      });
    }

    return res.json({
      success: true,
      message: "Nilai sidang berhasil dihapus permanen"
    });
  } catch (error) {
    return next(error);
  }
}