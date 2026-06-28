import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "../../config/prisma.js";

function buildDateWhere(query) {
  const { startDate, endDate } = query;

  if (!startDate && !endDate) {
    return {};
  }

  return {
    createdAt: {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {})
    }
  };
}

function buildSkripsiWhere(query) {
  const {
    status = "",
    tahap = "",
    peminatanId = "",
    search = ""
  } = query;

  return {
    ...buildDateWhere(query),
    ...(status ? { status } : {}),
    ...(tahap ? { tahap } : {}),
    ...(peminatanId ? { peminatanId } : {}),
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
}

async function getSkripsiReportRows(query) {
  const where = buildSkripsiWhere(query);

  return prisma.skripsi.findMany({
    where,
    orderBy: {
      createdAt: "desc"
    },
    include: {
      mahasiswa: {
        select: {
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
              identifier: true,
              name: true
            }
          }
        }
      },
      bimbinganLogs: true,
      jadwalSidang: {
        include: {
          ruang: true
        }
      },
      berkas: true,
      revisi: true,
      gamification: true
    }
  });
}

function mapSkripsiRow(item, index) {
  const validBimbinganCount = item.bimbinganLogs.filter(
    (log) => log.status === "DIVALIDASI"
  ).length;

  const pembimbing = item.dosenSkripsi
    .filter((row) => row.peran === "PEMBIMBING")
    .map((row) => row.dosen.name)
    .join(", ");

  const penguji = item.dosenSkripsi
    .filter((row) => row.peran === "PENGUJI")
    .map((row) => row.dosen.name)
    .join(", ");

  const latestJadwal = item.jadwalSidang[0];

  return {
    no: index + 1,
    npm: item.mahasiswa.identifier,
    mahasiswa: item.mahasiswa.name,
    email: item.mahasiswa.email || "-",
    judul: item.title || "-",
    peminatan: item.peminatan?.name || "-",
    jenisSkripsi: item.jenisSkripsi?.name || "-",
    tahap: item.tahap,
    status: item.status,
    pembimbing: pembimbing || "-",
    penguji: penguji || "-",
    bimbinganValid: validBimbinganCount,
    jumlahBerkas: item.berkas.length,
    jumlahRevisi: item.revisi.length,
    nilaiAkhir: item.nilaiAkhir ? String(item.nilaiAkhir) : "-",
    nilaiHuruf: item.nilaiHuruf || "-",
    progress: item.gamification?.progressPercent ?? 0,
    jadwalSidang: latestJadwal?.waktuMulai
      ? latestJadwal.waktuMulai.toISOString()
      : "-",
    ruang: latestJadwal?.ruang?.name || latestJadwal?.tempatManual || "-",
    createdAt: item.createdAt.toISOString()
  };
}

export async function getLaporanSummary(req, res, next) {
  try {
    const [
      totalSkripsi,
      activeSkripsi,
      selesai,
      menungguApproval,
      menungguJadwal,
      siapSidang,
      menungguRevisi,
      menungguFinal,
      menungguPengesahan,
      totalJadwal,
      totalBimbinganValid,
      totalPeminjamanPending
    ] = await prisma.$transaction([
      prisma.skripsi.count(),
      prisma.skripsi.count({
        where: {
          status: {
            notIn: ["SELESAI", "DITOLAK"]
          }
        }
      }),
      prisma.skripsi.count({ where: { status: "SELESAI" } }),
      prisma.skripsi.count({ where: { status: "MENUNGGU_APPROVAL" } }),
      prisma.skripsi.count({ where: { status: "MENUNGGU_JADWAL" } }),
      prisma.skripsi.count({ where: { status: "SIAP_SIDANG" } }),
      prisma.skripsi.count({ where: { status: "MENUNGGU_REVISI" } }),
      prisma.skripsi.count({ where: { status: "MENUNGGU_FINAL" } }),
      prisma.skripsi.count({ where: { status: "MENUNGGU_PENGESAHAN" } }),
      prisma.jadwalSidang.count(),
      prisma.bimbinganLog.count({ where: { status: "DIVALIDASI" } }),
      prisma.peminjamanRuang.count({ where: { status: "DIAJUKAN" } })
    ]);

    const byStatus = await prisma.skripsi.groupBy({
      by: ["status"],
      _count: {
        id: true
      },
      orderBy: {
        status: "asc"
      }
    });

    const byTahap = await prisma.skripsi.groupBy({
      by: ["tahap"],
      _count: {
        id: true
      },
      orderBy: {
        tahap: "asc"
      }
    });

    const byPeminatan = await prisma.skripsi.groupBy({
      by: ["peminatanId"],
      _count: {
        id: true
      }
    });

    const peminatanIds = byPeminatan
      .map((item) => item.peminatanId)
      .filter(Boolean);

    const peminatanRows = await prisma.peminatan.findMany({
      where: {
        id: {
          in: peminatanIds
        }
      }
    });

    const peminatanMap = Object.fromEntries(
      peminatanRows.map((item) => [item.id, item.name])
    );

    return res.json({
      success: true,
      data: {
        cards: {
          totalSkripsi,
          activeSkripsi,
          selesai,
          menungguApproval,
          menungguJadwal,
          siapSidang,
          menungguRevisi,
          menungguFinal,
          menungguPengesahan,
          totalJadwal,
          totalBimbinganValid,
          totalPeminjamanPending
        },
        byStatus: byStatus.map((item) => ({
          status: item.status,
          count: item._count.id
        })),
        byTahap: byTahap.map((item) => ({
          tahap: item.tahap,
          count: item._count.id
        })),
        byPeminatan: byPeminatan.map((item) => ({
          peminatanId: item.peminatanId,
          peminatan: item.peminatanId
            ? peminatanMap[item.peminatanId] || "-"
            : "Belum dipilih",
          count: item._count.id
        }))
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function getLaporanSkripsi(req, res, next) {
  try {
    const {
      page = "1",
      limit = "20"
    } = req.query;

    const currentPage = Math.max(Number(page), 1);
    const pageSize = Math.min(Math.max(Number(limit), 1), 100);
    const skip = (currentPage - 1) * pageSize;
    const where = buildSkripsiWhere(req.query);

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
                  identifier: true,
                  name: true
                }
              }
            }
          },
          bimbinganLogs: true,
          jadwalSidang: {
            include: {
              ruang: true
            },
            orderBy: {
              waktuMulai: "desc"
            }
          },
          berkas: true,
          revisi: true,
          gamification: true
        }
      })
    ]);

    return res.json({
      success: true,
      data: data.map(mapSkripsiRow),
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

export async function exportLaporanSkripsiExcel(req, res, next) {
  try {
    const rows = await getSkripsiReportRows(req.query);
    const mappedRows = rows.map(mapSkripsiRow);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sisidang";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Laporan Skripsi");

    worksheet.columns = [
      { header: "No", key: "no", width: 8 },
      { header: "NPM", key: "npm", width: 18 },
      { header: "Mahasiswa", key: "mahasiswa", width: 28 },
      { header: "Email", key: "email", width: 28 },
      { header: "Judul", key: "judul", width: 50 },
      { header: "Peminatan", key: "peminatan", width: 24 },
      { header: "Jenis Skripsi", key: "jenisSkripsi", width: 24 },
      { header: "Tahap", key: "tahap", width: 20 },
      { header: "Status", key: "status", width: 24 },
      { header: "Pembimbing", key: "pembimbing", width: 28 },
      { header: "Penguji", key: "penguji", width: 28 },
      { header: "Bimbingan Valid", key: "bimbinganValid", width: 18 },
      { header: "Jumlah Berkas", key: "jumlahBerkas", width: 16 },
      { header: "Jumlah Revisi", key: "jumlahRevisi", width: 16 },
      { header: "Nilai Akhir", key: "nilaiAkhir", width: 14 },
      { header: "Nilai Huruf", key: "nilaiHuruf", width: 14 },
      { header: "Progress", key: "progress", width: 12 },
      { header: "Jadwal Sidang", key: "jadwalSidang", width: 26 },
      { header: "Ruang", key: "ruang", width: 24 },
      { header: "Tanggal Dibuat", key: "createdAt", width: 26 }
    ];

    worksheet.addRows(mappedRows);

    worksheet.getRow(1).font = {
      bold: true
    };

    worksheet.views = [
      {
        state: "frozen",
        ySplit: 1
      }
    ];

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="laporan-skripsi-${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    return next(error);
  }
}

export async function exportLaporanSkripsiPdf(req, res, next) {
  try {
    const rows = await getSkripsiReportRows(req.query);
    const mappedRows = rows.map(mapSkripsiRow);

    const doc = new PDFDocument({
      size: "A4",
      margin: 40
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="laporan-skripsi-${Date.now()}.pdf"`
    );

    doc.pipe(res);

    doc.fontSize(18).text("Laporan Skripsi Sisidang", {
      align: "center"
    });

    doc.moveDown(0.5);
    doc.fontSize(10).text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, {
      align: "center"
    });

    doc.moveDown();

    if (mappedRows.length === 0) {
      doc.fontSize(11).text("Tidak ada data sesuai filter.");
      doc.end();
      return;
    }

    mappedRows.forEach((item) => {
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(`${item.no}. ${item.mahasiswa} (${item.npm})`);

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(`Judul: ${item.judul}`)
        .text(`Status: ${item.status} | Tahap: ${item.tahap}`)
        .text(`Peminatan: ${item.peminatan}`)
        .text(`Pembimbing: ${item.pembimbing}`)
        .text(`Penguji: ${item.penguji}`)
        .text(`Bimbingan Valid: ${item.bimbinganValid}/8`)
        .text(`Nilai: ${item.nilaiAkhir} (${item.nilaiHuruf})`)
        .text(`Jadwal: ${item.jadwalSidang}`)
        .moveDown(0.8);

      if (doc.y > 730) {
        doc.addPage();
      }
    });

    doc.end();
  } catch (error) {
    return next(error);
  }
}