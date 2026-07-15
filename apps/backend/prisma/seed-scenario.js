import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

const defaultPassword = "pancasila123";

// ============================================================
// DATA DEFINISI USER
// ============================================================

const lecturers = [
  { identifier: "dyah_s", name: "Dyah Sulistyowati, S.Kom., M.Kom", roles: ["ketua_prodi"] },
  { identifier: "ninuk_w", name: "Ninuk Wiliani, S.Si., M.Kom", roles: ["dosen_koordinator"] },
  { identifier: "bambang_r", name: "Bambang Riono, S.Kom., MMSI", roles: ["dosen_penguji"] },
  { identifier: "sri_r", name: "Dra. Sri Rezeki C. Nursari, M.Kom", roles: ["dosen_penguji"] },
  { identifier: "amir_m", name: "Amir Murtako, S.Kom., M.Kom", roles: ["dosen_pembimbing"] },
  { identifier: "adi_w", name: "Adi Wahyu Pribadi, S.Si., M.Kom", roles: ["dosen_pembimbing"] },
  { identifier: "andiani", name: "Dr. Andiani, Dra., M.Kom", roles: ["dosen_pembimbing"] }
];

const staffs = [
  { identifier: "ridho_a", name: "Ridho Alamsyah", roles: ["admin", "staf_prodi"] },
  { identifier: "wahyu_a", name: "M. Wahyu Aditiar, S.Kom.", roles: ["staf_prodi"] }
];

const studentNames = [
  "Andi Pratama", "Budi Santoso", "Citra Dewi", "Dian Purnama", "Eka Saputra",
  "Fajar Hidayat", "Gita Rahmawati", "Hendra Wijaya", "Intan Permata", "Joko Susilo"
];

const skripsiTitles = [
  "Implementasi Deep Learning untuk Deteksi Penyakit Tanaman Padi Berbasis Citra Digital",
  "Sistem Keamanan Jaringan IoT Menggunakan Metode Intrusion Detection System",
  "Analisis Sentimen Media Sosial Terhadap Kebijakan Publik Menggunakan NLP",
  "Pengembangan Aplikasi E-Commerce dengan Arsitektur Microservices",
  "Prediksi Harga Saham Menggunakan Model LSTM dan Analisis Teknikal",
  "Perancangan Sistem Autentikasi Multi-Faktor Berbasis Blockchain",
  "Klasifikasi Citra Medis Menggunakan Convolutional Neural Network",
  "Desain dan Implementasi RESTful API Gateway untuk Sistem Terdistribusi",
  "Analisis Big Data untuk Optimalisasi Rantai Pasok Industri Manufaktur",
  "Pengembangan Sistem Rekomendasi Film Menggunakan Collaborative Filtering"
];

const peminatanMapping = ["ai", "ncs", "ds", "se", "ai", "ncs", "ds", "se", "ai", "ncs"];

const students = studentNames.map((name, i) => ({
  identifier: `45192100${String(i + 1).padStart(2, "0")}`,
  name,
  roles: ["mahasiswa"]
}));

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function clearData() {
  console.log("🗑️  Menghapus data skenario sebelumnya...");
  await prisma.pengesahan.deleteMany({});
  await prisma.suratPerjanjian.deleteMany({});
  await prisma.kodeEtik.deleteMany({});
  await prisma.gamification.deleteMany({});
  await prisma.userBadge.deleteMany({});
  await prisma.notifikasi.deleteMany({});
  await prisma.logAktivitas.deleteMany({});
  await prisma.peminjamanRuang.deleteMany({});
  await prisma.nilaiSidang.deleteMany({});
  await prisma.revisi.deleteMany({});
  await prisma.jadwalSidang.deleteMany({});
  await prisma.sidangDosen.deleteMany({});
  await prisma.sidang.deleteMany({});
  await prisma.skripsiDosen.deleteMany({});
  await prisma.berkas.deleteMany({});
  await prisma.bimbinganLog.deleteMany({});
  await prisma.skripsi.deleteMany({});

  const adminIdentifier = process.env.SEED_ADMIN_IDENTIFIER || "admin";
  await prisma.user.deleteMany({
    where: { identifier: { not: adminIdentifier } }
  });
}

async function createUser(userData) {
  const passwordHash = await bcrypt.hash(defaultPassword, Number(process.env.BCRYPT_SALT_ROUNDS) || 10);
  const email = `${userData.identifier}@univpancasila.ac.id`.toLowerCase();

  const user = await prisma.user.create({
    data: {
      identifier: userData.identifier,
      name: userData.name,
      email,
      passwordHash,
      status: "ACTIVE",
      profile: { create: {} }
    }
  });

  for (const roleSlug of userData.roles) {
    const role = await prisma.role.findUnique({ where: { slug: roleSlug } });
    if (role) {
      await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
    }
  }

  return user;
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function hoursAfter(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

import fs from "fs";
import path from "path";

async function addBerkas(skripsiId, uploadedById, kategori, status, sidangId = null) {
  const fileName = `${kategori.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`;
  const uploadDir = path.join(process.cwd(), "uploads", "berkas");
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, fileName);
  
  // Create a minimal valid dummy PDF file
  const dummyPdfContent = "%PDF-1.4\n%\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Count 1\n/Kids [3 0 R]\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n>>\nendobj\n4 0 obj\n<<\n/Length 73\n>>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(This is a dummy PDF file for testing) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000015 00000 n \n0000000064 00000 n \n0000000121 00000 n \n0000000259 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n382\n%%EOF\n";
  
  fs.writeFileSync(filePath, dummyPdfContent);

  return prisma.berkas.create({
    data: {
      skripsiId,
      sidangId,
      uploadedById,
      kategori,
      status,
      originalName: `${kategori.toLowerCase()}_document.pdf`,
      fileName: fileName,
      mimeType: "application/pdf",
      sizeBytes: BigInt(Buffer.byteLength(dummyPdfContent)),
      path: `http://localhost:3000/uploads/berkas/${fileName}`,
    }
  });
}

async function addBimbingan(skripsiId, mahasiswaId, dosenId, topik, status, offsetDays) {
  const tgl = daysAgo(offsetDays);
  return prisma.bimbinganLog.create({
    data: {
      skripsiId,
      mahasiswaId,
      dosenId,
      tanggalPengajuan: tgl,
      jadwalMulai: tgl,
      jadwalSelesai: hoursAfter(tgl, 1),
      topik,
      hasil: status === "DIVALIDASI" ? "Revisi sudah diperbaiki, lanjut ke pembahasan berikutnya." : null,
      status,
      catatanDosen: status === "DIVALIDASI" ? "ACC, silakan lanjut." : (status === "SELESAI" ? "Perbaiki di bagian metodologi." : null),
      catatanMahasiswa: "Berikut draft bab yang sudah saya kerjakan.",
      validatedAt: status === "DIVALIDASI" ? hoursAfter(tgl, 2) : null
    }
  });
}

async function assignPembimbing(skripsiId, dosenIds, assignedById = null) {
  for (const dosenId of dosenIds) {
    await prisma.skripsiDosen.create({
      data: { skripsiId, dosenId, peran: "PEMBIMBING", assignedById }
    });
  }
}

async function createSidangWithPenguji(skripsiId, jenis, attemptNo, status, hasil, pengujiIds, createdById = null) {
  const sidang = await prisma.sidang.create({
    data: {
      skripsiId, jenis, attemptNo, status, hasil,
      createdById,
      decidedById: hasil ? createdById : null,
      decidedAt: hasil ? new Date() : null
    }
  });

  for (const dosenId of pengujiIds) {
    await prisma.sidangDosen.create({
      data: { sidangId: sidang.id, dosenId, peran: "PENGUJI" }
    });
  }

  return sidang;
}

async function createJadwal(skripsiId, sidangId, ruangId, dibuatOlehId, offsetDays, status = "DIJADWALKAN") {
  const tanggal = daysAgo(offsetDays);
  return prisma.jadwalSidang.create({
    data: {
      skripsiId,
      sidangId,
      ruangId,
      dibuatOlehId,
      tanggal,
      waktuMulai: tanggal,
      waktuSelesai: hoursAfter(tanggal, 2),
      status
    }
  });
}

async function addNilai(skripsiId, sidangId, dosenId, komponen, nilai, bobot) {
  return prisma.nilaiSidang.create({
    data: { skripsiId, sidangId, dosenId, komponen, nilai, bobot }
  });
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  await clearData();

  console.log("👨‍🏫 Membuat Dosen dan Staff...");
  const dosen = {};
  for (const l of lecturers) {
    dosen[l.identifier] = await createUser(l);
  }
  for (const s of staffs) {
    dosen[s.identifier] = await createUser(s);
  }

  const dyah = dosen["dyah_s"]; // Kaprodi
  const ninuk = dosen["ninuk_w"]; // Koordinator
  const bambang = dosen["bambang_r"]; // Penguji
  const sri = dosen["sri_r"]; // Penguji
  const amir = dosen["amir_m"]; // Pembimbing
  const adi = dosen["adi_w"]; // Pembimbing
  const andiani = dosen["andiani"]; // Pembimbing
  const ridho = dosen["ridho_a"]; // Admin/Staf

  console.log("🎓 Membuat 10 Mahasiswa...");
  const mhs = [];
  for (const s of students) {
    mhs.push(await createUser(s));
  }

  const peminatanList = await prisma.peminatan.findMany();
  const jenisSkripsiList = await prisma.jenisSkripsi.findMany();
  const ruangList = await prisma.masterRuang.findMany();

  if (peminatanList.length === 0 || jenisSkripsiList.length === 0) {
    console.error("❌ Master data belum ada! Jalankan 'npx prisma db seed' dulu.");
    return;
  }

  const getPeminatan = (slug) => peminatanList.find(p => p.slug === slug) || peminatanList[0];
  const ruang = ruangList[0] || null;

  // ============================================================
  // CASE 1 (Andi): Baru daftar Sempro
  // Test: Mhs belum upload berkas. Dosen tidak bisa apa-apa.
  // ============================================================
  console.log("📋 Case 1: Baru daftar seminar proposal (belum upload berkas)");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[0].id,
        peminatanId: getPeminatan(peminatanMapping[0]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[0],
        abstract: "Penelitian ini membahas implementasi deep learning.",
        tahap: "SEMINAR_PROPOSAL",
        status: "MENUNGGU_BERKAS"
      }
    });

    await prisma.sidang.create({
      data: { skripsiId: skripsi.id, jenis: "SEMINAR_PROPOSAL", attemptNo: 1, status: "MENUNGGU_BERKAS", createdById: mhs[0].id }
    });
  }

  // ============================================================
  // CASE 2 (Budi): Sempro - Menunggu Penguji
  // Test: Berkas lengkap, Koordinator (Ninuk) assign penguji
  // ============================================================
  console.log("📋 Case 2: Sempro - berkas uploaded, menunggu assign penguji");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[1].id,
        peminatanId: getPeminatan(peminatanMapping[1]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[1],
        abstract: "Penelitian ini membahas IoT.",
        tahap: "SEMINAR_PROPOSAL",
        status: "MENUNGGU_JADWAL" // Status di skripsi MENUNGGU_JADWAL
      }
    });

    const sidang = await prisma.sidang.create({
      data: { skripsiId: skripsi.id, jenis: "SEMINAR_PROPOSAL", attemptNo: 1, status: "MENUNGGU_PENGUJI", createdById: mhs[1].id }
    });

    await addBerkas(skripsi.id, mhs[1].id, "PROPOSAL", "DIAJUKAN", sidang.id);
    await addBerkas(skripsi.id, mhs[1].id, "PRESENTASI", "DIAJUKAN", sidang.id);
  }

  // ============================================================
  // CASE 3 (Citra): Sempro - Menunggu Jadwal
  // Test: Penguji ada, Koordinator (Ninuk) buat jadwal
  // ============================================================
  console.log("📋 Case 3: Sempro - penguji assigned, menunggu jadwal");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[2].id,
        peminatanId: getPeminatan(peminatanMapping[2]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[2],
        abstract: "Penelitian sentimen medsos.",
        tahap: "SEMINAR_PROPOSAL",
        status: "MENUNGGU_JADWAL"
      }
    });

    const sidang = await createSidangWithPenguji(
      skripsi.id, "SEMINAR_PROPOSAL", 1, "MENUNGGU_JADWAL", null,
      [bambang.id, sri.id], ninuk.id
    );

    await addBerkas(skripsi.id, mhs[2].id, "PROPOSAL", "DIAJUKAN", sidang.id);
    await addBerkas(skripsi.id, mhs[2].id, "PRESENTASI", "DIAJUKAN", sidang.id);
  }

  // ============================================================
  // CASE 4 (Dian): Sempro - Dijadwalkan
  // Test: Penguji (Bambang/Sri) input hasil (LOLOS/REVISI dsb)
  // ============================================================
  console.log("📋 Case 4: Sempro - dijadwalkan, menunggu input hasil");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[3].id,
        peminatanId: getPeminatan(peminatanMapping[3]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[3],
        abstract: "Aplikasi e-commerce microservices.",
        tahap: "SEMINAR_PROPOSAL",
        status: "SIAP_SIDANG"
      }
    });

    const sidang = await createSidangWithPenguji(
      skripsi.id, "SEMINAR_PROPOSAL", 1, "DIJADWALKAN", null,
      [bambang.id, sri.id], ninuk.id
    );

    await addBerkas(skripsi.id, mhs[3].id, "PROPOSAL", "DIAJUKAN", sidang.id);
    await addBerkas(skripsi.id, mhs[3].id, "PRESENTASI", "DIAJUKAN", sidang.id);

    if (ruang) await createJadwal(skripsi.id, sidang.id, ruang.id, ninuk.id, -3);
  }

  // ============================================================
  // CASE 5 (Eka): Menunggu Pembimbing (Sempro Lolos)
  // Test: Koordinator assign pembimbing (Amir, Adi, atau Andiani)
  // ============================================================
  console.log("📋 Case 5: Sempro lolos, menunggu assign pembimbing");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[4].id,
        peminatanId: getPeminatan(peminatanMapping[4]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[4],
        abstract: "Prediksi harga saham.",
        tahap: "KOMPRE",
        status: "MENUNGGU_PEMBIMBING",
        seminarApprovedAt: daysAgo(30)
      }
    });

    const sidang = await createSidangWithPenguji(
      skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS",
      [bambang.id, sri.id], ninuk.id
    );

    await addBerkas(skripsi.id, mhs[4].id, "PROPOSAL", "DISETUJUI", sidang.id);
    await addBerkas(skripsi.id, mhs[4].id, "PRESENTASI", "DISETUJUI", sidang.id);
  }

  // ============================================================
  // CASE 6 (Fajar): Bimbingan Aktif (Belum cukup)
  // Test: Mhs ajukan bimbingan, Dosen (Amir/Adi) konfirmasi/isi hasil
  // ============================================================
  console.log("📋 Case 6: Bimbingan aktif - 4 bimbingan valid (belum cukup maju semhas)");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[5].id,
        peminatanId: getPeminatan(peminatanMapping[5]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[5],
        abstract: "Sistem autentikasi multi-faktor.",
        tahap: "KOMPRE",
        status: "BIMBINGAN",
        seminarApprovedAt: daysAgo(60)
      }
    });

    const sidang = await createSidangWithPenguji(
      skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS",
      [bambang.id, sri.id], ninuk.id
    );
    await addBerkas(skripsi.id, mhs[5].id, "PROPOSAL", "DISETUJUI", sidang.id);
    await addBerkas(skripsi.id, mhs[5].id, "PRESENTASI", "DISETUJUI", sidang.id);

    // Assign pembimbing
    await assignPembimbing(skripsi.id, [amir.id, adi.id], ninuk.id);

    for (let j = 1; j <= 2; j++) {
      await addBimbingan(skripsi.id, mhs[5].id, amir.id, `Bab 1 & 2 - P1 - #${j}`, "DIVALIDASI", 50 - j * 5);
      await addBimbingan(skripsi.id, mhs[5].id, adi.id, `Bab 1 & 2 - P2 - #${j}`, "DIVALIDASI", 48 - j * 5);
    }
  }

  // ============================================================
  // CASE 7 (Gita): Bimbingan 8x (Siap Approve Semhas)
  // Test: Pembimbing (Amir/Andiani) klik "Approve Maju Semhas"
  // ============================================================
  console.log("📋 Case 7: Bimbingan 8x valid - SIAP approve maju seminar hasil ⭐");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[6].id,
        peminatanId: getPeminatan(peminatanMapping[6]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[6],
        abstract: "Klasifikasi citra medis CNN.",
        tahap: "KOMPRE",
        status: "BIMBINGAN",
        seminarApprovedAt: daysAgo(90)
      }
    });

    const sidang = await createSidangWithPenguji(
      skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS",
      [bambang.id, sri.id], ninuk.id
    );
    await addBerkas(skripsi.id, mhs[6].id, "PROPOSAL", "DISETUJUI", sidang.id);
    await addBerkas(skripsi.id, mhs[6].id, "PRESENTASI", "DISETUJUI", sidang.id);

    // Assign pembimbing
    await assignPembimbing(skripsi.id, [amir.id, andiani.id], ninuk.id);

    for (let j = 0; j < 8; j++) {
      await addBimbingan(skripsi.id, mhs[6].id, amir.id, `Bimbingan Bab ${j+1} - P1`, "DIVALIDASI", 80 - j * 4);
      await addBimbingan(skripsi.id, mhs[6].id, andiani.id, `Bimbingan Bab ${j+1} - P2`, "DIVALIDASI", 78 - j * 4);
    }
  }

  // ============================================================
  // CASE 8 (Hendra): Semhas Dijadwalkan
  // Test: Penguji (Bambang/Sri) input nilai & hasil Semhas
  // ============================================================
  console.log("📋 Case 8: Semhas - dijadwalkan, menunggu input nilai & hasil");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[7].id,
        peminatanId: getPeminatan(peminatanMapping[7]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[7],
        abstract: "RESTful API Gateway.",
        tahap: "SIDANG_SKRIPSI",
        status: "MENUNGGU_SEMINAR_HASIL",
        seminarApprovedAt: daysAgo(120),
        sidangApprovedAt: daysAgo(20)
      }
    });

    await createSidangWithPenguji(skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS", [bambang.id, sri.id], ninuk.id);
    await assignPembimbing(skripsi.id, [adi.id, andiani.id], ninuk.id);

    for (let j = 0; j < 8; j++) {
      await addBimbingan(skripsi.id, mhs[7].id, adi.id, `Bimbingan ${j}`, "DIVALIDASI", 100 - j * 5);
      await addBimbingan(skripsi.id, mhs[7].id, andiani.id, `Bimbingan ${j}`, "DIVALIDASI", 95 - j * 5);
    }

    const semhasSidang = await createSidangWithPenguji(
      skripsi.id, "SEMINAR_HASIL", 1, "DIJADWALKAN", null,
      [bambang.id, sri.id], ninuk.id
    );
    await addBerkas(skripsi.id, mhs[7].id, "SIDANG_SOFTCOPY", "DIAJUKAN", semhasSidang.id);
    await addBerkas(skripsi.id, mhs[7].id, "SIDANG_PRESENTASI", "DIAJUKAN", semhasSidang.id);

    if (ruang) await createJadwal(skripsi.id, semhasSidang.id, ruang.id, ninuk.id, -5);
  }

  // ============================================================
  // CASE 9 (Intan): Sidang Akhir Dijadwalkan
  // Test: Penguji input keputusan LULUS/TIDAK_LULUS
  // ============================================================
  console.log("📋 Case 9: Sidang Akhir - dijadwalkan, menunggu keputusan");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[8].id,
        peminatanId: getPeminatan(peminatanMapping[8]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[8],
        abstract: "Big Data Supply Chain.",
        tahap: "FINAL",
        status: "MENUNGGU_SIDANG_AKHIR",
        seminarApprovedAt: daysAgo(180),
        sidangApprovedAt: daysAgo(60)
      }
    });

    await createSidangWithPenguji(skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS", [bambang.id, sri.id], ninuk.id);
    await assignPembimbing(skripsi.id, [amir.id, adi.id], ninuk.id);

    for (let j = 0; j < 8; j++) {
      await addBimbingan(skripsi.id, mhs[8].id, amir.id, `Bim ${j}`, "DIVALIDASI", 150 - j * 5);
      await addBimbingan(skripsi.id, mhs[8].id, adi.id, `Bim ${j}`, "DIVALIDASI", 145 - j * 5);
    }

    await createSidangWithPenguji(skripsi.id, "SEMINAR_HASIL", 1, "SELESAI", "LOLOS", [bambang.id, sri.id], ninuk.id);
    await createSidangWithPenguji(skripsi.id, "SIDANG_KOMPRE", 1, "SELESAI", "LOLOS", [bambang.id, sri.id], ninuk.id);

    const sidangAkhir = await createSidangWithPenguji(
      skripsi.id, "SIDANG_AKHIR", 1, "DIJADWALKAN", null,
      [bambang.id, sri.id], ninuk.id
    );

    await addBerkas(skripsi.id, mhs[8].id, "FINAL_SKRIPSI", "DIAJUKAN", sidangAkhir.id);

    if (ruang) await createJadwal(skripsi.id, sidangAkhir.id, ruang.id, ninuk.id, -10);
  }

  // ============================================================
  // CASE 10 (Joko): LULUS SKRIPSI
  // Test: Dashboard finish
  // ============================================================
  console.log("📋 Case 10: LULUS SKRIPSI - semua tahap complete ✅");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[9].id,
        peminatanId: getPeminatan(peminatanMapping[9]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[9],
        abstract: "Sistem Rekomendasi Film.",
        tahap: "FINAL",
        status: "LULUS_SKRIPSI",
        seminarApprovedAt: daysAgo(200),
        sidangApprovedAt: daysAgo(100),
        selesaiAt: daysAgo(5),
        nilaiAkhir: 88.5,
        nilaiHuruf: "A"
      }
    });

    await createSidangWithPenguji(skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS", [bambang.id, sri.id], ninuk.id);
    await assignPembimbing(skripsi.id, [amir.id, andiani.id], ninuk.id);

    for (let j = 0; j < 8; j++) {
      await addBimbingan(skripsi.id, mhs[9].id, amir.id, `Bim ${j}`, "DIVALIDASI", 190 - j * 5);
      await addBimbingan(skripsi.id, mhs[9].id, andiani.id, `Bim ${j}`, "DIVALIDASI", 185 - j * 5);
    }

    await createSidangWithPenguji(skripsi.id, "SEMINAR_HASIL", 1, "SELESAI", "LOLOS", [bambang.id, sri.id], ninuk.id);
    
    const kompre = await createSidangWithPenguji(skripsi.id, "SIDANG_KOMPRE", 1, "SELESAI", "LOLOS", [bambang.id, sri.id], ninuk.id);
    await addNilai(skripsi.id, kompre.id, bambang.id, "kompre", 85, 30);
    await addNilai(skripsi.id, kompre.id, sri.id, "kompre", 88, 30);

    const akhir = await createSidangWithPenguji(skripsi.id, "SIDANG_AKHIR", 1, "SELESAI", "LULUS", [bambang.id, sri.id], ninuk.id);
    await addBerkas(skripsi.id, mhs[9].id, "FINAL_SKRIPSI", "DISETUJUI", akhir.id);
    await addBerkas(skripsi.id, mhs[9].id, "LEMBAR_PENGESAHAN", "DISETUJUI", akhir.id);

    await addNilai(skripsi.id, akhir.id, bambang.id, "sidang", 90, 40);
    await addNilai(skripsi.id, akhir.id, sri.id, "sidang", 85, 40);

    if (ruang) await createJadwal(skripsi.id, akhir.id, ruang.id, ninuk.id, 5, "SELESAI");

    await prisma.gamification.create({
      data: { skripsiId: skripsi.id, progressPercent: 100, points: 500 }
    });
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log("🎉 SKENARIO SEED SELESAI!");
  console.log("=".repeat(60));
  console.log(`Password default semua user: ${defaultPassword}`);
  console.log("\n📊 Distribusi 10 mahasiswa ke berbagai case:\n");
  console.log("  Case 1  (4519210001 - Andi Pratama)   → Baru daftar, belum upload berkas sempro");
  console.log("  Case 2  (4519210002 - Budi Santoso)   → Sempro: menunggu penguji di-assign");
  console.log("  Case 3  (4519210003 - Citra Dewi)     → Sempro: menunggu jadwal dibuat");
  console.log("  Case 4  (4519210004 - Dian Purnama)   → Sempro: dijadwalkan, menunggu input hasil");
  console.log("  Case 5  (4519210005 - Eka Saputra)    → Sempro LOLOS, menunggu assign pembimbing");
  console.log("  Case 6  (4519210006 - Fajar Hidayat)  → Bimbingan: 4x valid (belum cukup)");
  console.log("  Case 7  (4519210007 - Gita Rahmawati) → Bimbingan: 8x valid ⭐ SIAP approve maju semhas");
  console.log("  Case 8  (4519210008 - Hendra Wijaya)  → Semhas: dijadwalkan, menunggu nilai & hasil");
  console.log("  Case 9  (4519210009 - Intan Permata)  → Sidang Akhir: dijadwalkan, menunggu keputusan");
  console.log("  Case 10 (4519210010 - Joko Susilo)    → LULUS SKRIPSI ✅");
  console.log("=".repeat(60));
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
