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
  { identifier: "dyah_s", name: "Dyah Sulistyowati, S.Kom., M.Kom", roles: ["ketua_prodi", "dosen_koordinator", "dosen_penguji", "dosen_pembimbing"] },
  { identifier: "bambang_r", name: "Bambang Riono, S.Kom., MMSI", roles: ["dosen_penguji", "dosen_pembimbing"] },
  { identifier: "amir_m", name: "Amir Murtako, S.Kom., M.Kom", roles: ["dosen_penguji", "dosen_pembimbing"] },
  { identifier: "adi_w", name: "Adi Wahyu Pribadi, S.Si., M.Kom", roles: ["dosen_penguji", "dosen_pembimbing"] },
  { identifier: "sri_r", name: "Dra. Sri Rezeki C. Nursari, M.Kom", roles: ["dosen_penguji", "dosen_pembimbing"] }
];

const staffs = [
  { identifier: "ridho_a", name: "Ridho Alamsyah", roles: ["admin", "staf_prodi"] },
  { identifier: "wahyu_a", name: "M. Wahyu Aditiar, S.Kom.", roles: ["staf_prodi"] }
];

const studentNames = [
  "Andi Pratama", "Budi Santoso", "Citra Dewi", "Dian Purnama", "Eka Saputra",
  "Fajar Hidayat", "Gita Rahmawati", "Hendra Wijaya", "Intan Permata", "Joko Susilo",
  "Karina Putri", "Luthfi Rahman", "Maya Anggraini", "Naufal Hakim", "Olivia Sari"
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
  "Pengembangan Sistem Rekomendasi Film Menggunakan Collaborative Filtering",
  "Implementasi Zero Trust Architecture pada Infrastruktur Cloud Enterprise",
  "Visualisasi Data Geospasial untuk Pemetaan Risiko Bencana Alam",
  "Pengembangan Progressive Web App untuk Sistem Manajemen Inventaris",
  "Deteksi Anomali pada Network Traffic Menggunakan Machine Learning",
  "Rancang Bangun Sistem Monitoring Kualitas Udara Berbasis IoT dan Dashboard Real-time"
];

const peminatanMapping = ["ai", "ncs", "ds", "se", "ai", "ncs", "ds", "se", "ai", "ncs", "ds", "se", "ai", "ncs", "ds"];

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

async function addBerkas(skripsiId, uploadedById, kategori, status, sidangId = null) {
  return prisma.berkas.create({
    data: {
      skripsiId,
      sidangId,
      uploadedById,
      kategori,
      status,
      originalName: `${kategori.toLowerCase()}_document.pdf`,
      fileName: `${kategori.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: BigInt(Math.floor(Math.random() * 500000) + 50000),
      path: `/uploads/dummy/${kategori.toLowerCase()}.pdf`,
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

  // --- Buat Users ---
  console.log("👨‍🏫 Membuat Dosen dan Staff...");
  const dosen = {};
  for (const l of lecturers) {
    dosen[l.identifier] = await createUser(l);
  }
  for (const s of staffs) {
    dosen[s.identifier] = await createUser(s);
  }

  const dyah = dosen["dyah_s"];
  const bambang = dosen["bambang_r"];
  const amir = dosen["amir_m"];
  const adi = dosen["adi_w"];
  const sri = dosen["sri_r"];
  const ridho = dosen["ridho_a"];

  console.log("🎓 Membuat 15 Mahasiswa...");
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
  // CASE 1 (Mhs 1): Baru daftar, belum upload berkas sempro
  // Test: Mahasiswa bisa melihat dashboard kosong, upload proposal+presentasi
  // ============================================================
  console.log("📋 Case 1: Baru daftar seminar proposal (belum upload berkas)");
  await prisma.skripsi.create({
    data: {
      mahasiswaId: mhs[0].id,
      peminatanId: getPeminatan(peminatanMapping[0]).id,
      jenisSkripsiId: jenisSkripsiList[0].id,
      title: skripsiTitles[0],
      abstract: "Penelitian ini membahas implementasi deep learning untuk deteksi penyakit tanaman.",
      tahap: "SEMINAR_PROPOSAL",
      status: "MENUNGGU_BERKAS"
    }
  });

  // ============================================================
  // CASE 2 (Mhs 2): Sudah upload berkas, menunggu penguji di-assign
  // Test: Koordinator/Kaprodi bisa assign penguji, mahasiswa lihat status
  // ============================================================
  console.log("📋 Case 2: Sempro - berkas sudah upload, menunggu assign penguji");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[1].id,
        peminatanId: getPeminatan(peminatanMapping[1]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[1],
        abstract: "Penelitian ini membahas sistem keamanan jaringan IoT.",
        tahap: "SEMINAR_PROPOSAL",
        status: "MENUNGGU_JADWAL"
      }
    });

    const sidang = await prisma.sidang.create({
      data: { skripsiId: skripsi.id, jenis: "SEMINAR_PROPOSAL", attemptNo: 1, status: "MENUNGGU_PENGUJI", createdById: mhs[1].id }
    });

    await addBerkas(skripsi.id, mhs[1].id, "PROPOSAL", "DIAJUKAN", sidang.id);
    await addBerkas(skripsi.id, mhs[1].id, "PRESENTASI", "DIAJUKAN", sidang.id);
  }

  // ============================================================
  // CASE 3 (Mhs 3): Sempro sudah ada penguji, menunggu jadwal
  // Test: Koordinator/Kaprodi bisa buat jadwal sidang
  // ============================================================
  console.log("📋 Case 3: Sempro - penguji sudah di-assign, menunggu jadwal");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[2].id,
        peminatanId: getPeminatan(peminatanMapping[2]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[2],
        abstract: "Penelitian ini membahas analisis sentimen media sosial.",
        tahap: "SEMINAR_PROPOSAL",
        status: "MENUNGGU_JADWAL"
      }
    });

    const sidang = await prisma.sidang.create({
      data: { skripsiId: skripsi.id, jenis: "SEMINAR_PROPOSAL", attemptNo: 1, status: "MENUNGGU_JADWAL", createdById: mhs[2].id }
    });

    await addBerkas(skripsi.id, mhs[2].id, "PROPOSAL", "DIAJUKAN", sidang.id);
    await addBerkas(skripsi.id, mhs[2].id, "PRESENTASI", "DIAJUKAN", sidang.id);
    await prisma.sidangDosen.create({ data: { sidangId: sidang.id, dosenId: bambang.id, peran: "PENGUJI" } });
    await prisma.sidangDosen.create({ data: { sidangId: sidang.id, dosenId: amir.id, peran: "PENGUJI" } });
  }

  // ============================================================
  // CASE 4 (Mhs 4): Sempro sudah dijadwalkan, menunggu input hasil
  // Test: Penguji bisa input hasil sidang (LOLOS/TIDAK_LOLOS/REVISI/ULANG)
  // ============================================================
  console.log("📋 Case 4: Sempro - sudah dijadwalkan, menunggu input hasil");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[3].id,
        peminatanId: getPeminatan(peminatanMapping[3]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[3],
        abstract: "Penelitian ini membahas pengembangan aplikasi e-commerce.",
        tahap: "SEMINAR_PROPOSAL",
        status: "SIAP_SIDANG"
      }
    });

    const sidang = await createSidangWithPenguji(
      skripsi.id, "SEMINAR_PROPOSAL", 1, "DIJADWALKAN", null,
      [adi.id, sri.id], dyah.id
    );

    await addBerkas(skripsi.id, mhs[3].id, "PROPOSAL", "DIAJUKAN", sidang.id);
    await addBerkas(skripsi.id, mhs[3].id, "PRESENTASI", "DIAJUKAN", sidang.id);

    if (ruang) {
      await createJadwal(skripsi.id, sidang.id, ruang.id, dyah.id, -3);
    }
  }

  // ============================================================
  // CASE 5 (Mhs 5): Sempro LOLOS, menunggu assign pembimbing
  // Test: Koordinator bisa assign pembimbing setelah sempro lolos
  // ============================================================
  console.log("📋 Case 5: Sempro lolos, menunggu assign pembimbing");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[4].id,
        peminatanId: getPeminatan(peminatanMapping[4]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[4],
        abstract: "Penelitian ini membahas prediksi harga saham menggunakan LSTM.",
        tahap: "KOMPRE",
        status: "MENUNGGU_PEMBIMBING",
        seminarApprovedAt: daysAgo(30)
      }
    });

    const sidang = await createSidangWithPenguji(
      skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS",
      [bambang.id, amir.id], dyah.id
    );

    await addBerkas(skripsi.id, mhs[4].id, "PROPOSAL", "DISETUJUI", sidang.id);
    await addBerkas(skripsi.id, mhs[4].id, "PRESENTASI", "DISETUJUI", sidang.id);
  }

  // ============================================================
  // CASE 6 (Mhs 6): Bimbingan aktif, baru 3x bimbingan valid
  // Test: Mahasiswa ajukan bimbingan, dosen konfirmasi/isi hasil, mhs validasi
  // ============================================================
  console.log("📋 Case 6: Bimbingan aktif - 3 bimbingan valid (belum cukup)");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[5].id,
        peminatanId: getPeminatan(peminatanMapping[5]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[5],
        abstract: "Penelitian ini membahas perancangan sistem autentikasi multi-faktor.",
        tahap: "KOMPRE",
        status: "BIMBINGAN",
        seminarApprovedAt: daysAgo(60)
      }
    });

    const semproSidang = await createSidangWithPenguji(
      skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS",
      [adi.id, sri.id], dyah.id
    );
    await addBerkas(skripsi.id, mhs[5].id, "PROPOSAL", "DISETUJUI", semproSidang.id);
    await addBerkas(skripsi.id, mhs[5].id, "PRESENTASI", "DISETUJUI", semproSidang.id);

    await assignPembimbing(skripsi.id, [bambang.id, amir.id], dyah.id);

    // 3 bimbingan valid
    for (let j = 1; j <= 3; j++) {
      await addBimbingan(skripsi.id, mhs[5].id, bambang.id, `Bimbingan Bab ${j} - Pembimbing 1`, "DIVALIDASI", 50 - j * 5);
    }
    // 1 bimbingan belum divalidasi (SELESAI - menunggu mahasiswa konfirmasi)
    await addBimbingan(skripsi.id, mhs[5].id, amir.id, "Review Bab 2 - Pembimbing 2", "SELESAI", 5);
    // 1 bimbingan DIAJUKAN (menunggu dosen konfirmasi)
    await addBimbingan(skripsi.id, mhs[5].id, bambang.id, "Diskusi Metodologi Bab 3", "DIAJUKAN", 1);
  }

  // ============================================================
  // CASE 7 (Mhs 7): Bimbingan selesai 8x, siap approve maju seminar hasil
  // Test: Dosen pembimbing bisa klik "Approve Maju Seminar Hasil"
  // ============================================================
  console.log("📋 Case 7: Bimbingan 8x valid - SIAP approve maju seminar hasil ⭐");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[6].id,
        peminatanId: getPeminatan(peminatanMapping[6]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[6],
        abstract: "Penelitian ini membahas klasifikasi citra medis menggunakan CNN.",
        tahap: "KOMPRE",
        status: "BIMBINGAN",
        seminarApprovedAt: daysAgo(90)
      }
    });

    const semproSidang = await createSidangWithPenguji(
      skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS",
      [bambang.id, dyah.id], dyah.id
    );
    await addBerkas(skripsi.id, mhs[6].id, "PROPOSAL", "DISETUJUI", semproSidang.id);
    await addBerkas(skripsi.id, mhs[6].id, "PRESENTASI", "DISETUJUI", semproSidang.id);

    await assignPembimbing(skripsi.id, [adi.id, sri.id], dyah.id);

    // 8 bimbingan DIVALIDASI (memenuhi syarat)
    const topikBab = ["Pendahuluan", "Tinjauan Pustaka", "Metodologi", "Analisis", "Perancangan", "Implementasi", "Pengujian", "Kesimpulan"];
    for (let j = 0; j < 8; j++) {
      const dosenBimbing = j % 2 === 0 ? adi.id : sri.id;
      await addBimbingan(skripsi.id, mhs[6].id, dosenBimbing, `Bimbingan ${topikBab[j]}`, "DIVALIDASI", 80 - j * 8);
    }
  }

  // ============================================================
  // CASE 8 (Mhs 8): Seminar Hasil - menunggu upload berkas semhas
  // Test: Mahasiswa upload berkas SIDANG_SOFTCOPY dan SIDANG_PRESENTASI
  // ============================================================
  console.log("📋 Case 8: Seminar Hasil - menunggu upload berkas");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[7].id,
        peminatanId: getPeminatan(peminatanMapping[7]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[7],
        abstract: "Penelitian ini membahas desain dan implementasi RESTful API Gateway.",
        tahap: "SIDANG_SKRIPSI",
        status: "MENUNGGU_SEMINAR_HASIL",
        seminarApprovedAt: daysAgo(100),
        sidangApprovedAt: daysAgo(10)
      }
    });

    await createSidangWithPenguji(skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS", [amir.id, adi.id], dyah.id);
    await assignPembimbing(skripsi.id, [bambang.id, sri.id], dyah.id);

    for (let j = 0; j < 8; j++) {
      await addBimbingan(skripsi.id, mhs[7].id, j % 2 === 0 ? bambang.id : sri.id, `Bimbingan sesi ${j + 1}`, "DIVALIDASI", 90 - j * 8);
    }

    // Sidang Seminar Hasil dibuat tapi berkas belum ada
    await prisma.sidang.create({
      data: { skripsiId: skripsi.id, jenis: "SEMINAR_HASIL", attemptNo: 1, status: "MENUNGGU_BERKAS", createdById: bambang.id }
    });
  }

  // ============================================================
  // CASE 9 (Mhs 9): Seminar Hasil - sudah dijadwalkan, menunggu nilai+hasil
  // Test: Penguji input nilai, lalu input hasil (LOLOS/REVISI)
  // ============================================================
  console.log("📋 Case 9: Seminar Hasil - dijadwalkan, menunggu input nilai & hasil");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[8].id,
        peminatanId: getPeminatan(peminatanMapping[8]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[8],
        abstract: "Penelitian ini membahas analisis big data untuk optimalisasi rantai pasok.",
        tahap: "SIDANG_SKRIPSI",
        status: "MENUNGGU_SEMINAR_HASIL",
        seminarApprovedAt: daysAgo(120),
        sidangApprovedAt: daysAgo(20)
      }
    });

    await createSidangWithPenguji(skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS", [sri.id, dyah.id], dyah.id);
    await assignPembimbing(skripsi.id, [amir.id, adi.id], dyah.id);

    for (let j = 0; j < 8; j++) {
      await addBimbingan(skripsi.id, mhs[8].id, j % 2 === 0 ? amir.id : adi.id, `Bimbingan sesi ${j + 1}`, "DIVALIDASI", 100 - j * 8);
    }

    const semhasSidang = await createSidangWithPenguji(
      skripsi.id, "SEMINAR_HASIL", 1, "DIJADWALKAN", null,
      [bambang.id, dyah.id], dyah.id
    );
    await addBerkas(skripsi.id, mhs[8].id, "SIDANG_SOFTCOPY", "DIAJUKAN", semhasSidang.id);
    await addBerkas(skripsi.id, mhs[8].id, "SIDANG_PRESENTASI", "DIAJUKAN", semhasSidang.id);

    if (ruang) {
      await createJadwal(skripsi.id, semhasSidang.id, ruang.id, dyah.id, -5);
    }
  }

  // ============================================================
  // CASE 10 (Mhs 10): Seminar Hasil REVISI - menunggu upload revisi
  // Test: Mahasiswa upload revisi, penguji/koordinator approve revisi
  // ============================================================
  console.log("📋 Case 10: Seminar Hasil - hasil REVISI, menunggu upload revisi mhs");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[9].id,
        peminatanId: getPeminatan(peminatanMapping[9]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[9],
        abstract: "Penelitian ini membahas pengembangan sistem rekomendasi film.",
        tahap: "SIDANG_SKRIPSI",
        status: "MENUNGGU_KOMPRE",
        seminarApprovedAt: daysAgo(150),
        sidangApprovedAt: daysAgo(40)
      }
    });

    await createSidangWithPenguji(skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS", [adi.id, amir.id], dyah.id);
    await assignPembimbing(skripsi.id, [sri.id, dyah.id], dyah.id);

    for (let j = 0; j < 8; j++) {
      await addBimbingan(skripsi.id, mhs[9].id, j % 2 === 0 ? sri.id : dyah.id, `Bimbingan sesi ${j + 1}`, "DIVALIDASI", 130 - j * 10);
    }

    const semhasSidang = await createSidangWithPenguji(
      skripsi.id, "SEMINAR_HASIL", 1, "SELESAI", "REVISI",
      [bambang.id, amir.id], dyah.id
    );

    await addBerkas(skripsi.id, mhs[9].id, "SIDANG_SOFTCOPY", "DISETUJUI", semhasSidang.id);
    await addBerkas(skripsi.id, mhs[9].id, "SIDANG_PRESENTASI", "DISETUJUI", semhasSidang.id);

    // Revisi dari penguji (belum di-upload oleh mahasiswa)
    await prisma.revisi.create({
      data: {
        skripsiId: skripsi.id,
        sidangId: semhasSidang.id,
        dibuatOlehId: bambang.id,
        catatan: "Perbaiki bagian metodologi penelitian dan tambahkan referensi terbaru.",
        status: "MENUNGGU_DIAJUKAN",
        deadline: daysAgo(-14) // 14 hari ke depan
      }
    });
  }

  // ============================================================
  // CASE 11 (Mhs 11): Sidang Kompre - menunggu assign penguji
  // Test: Koordinator assign penguji sidang kompre
  // ============================================================
  console.log("📋 Case 11: Sidang Kompre - menunggu assign penguji");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[10].id,
        peminatanId: getPeminatan(peminatanMapping[10]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[10],
        abstract: "Penelitian ini membahas implementasi zero trust architecture.",
        tahap: "SIDANG_SKRIPSI",
        status: "MENUNGGU_KOMPRE",
        seminarApprovedAt: daysAgo(180),
        sidangApprovedAt: daysAgo(60)
      }
    });

    await createSidangWithPenguji(skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS", [bambang.id, sri.id], dyah.id);
    await assignPembimbing(skripsi.id, [amir.id, adi.id], dyah.id);

    for (let j = 0; j < 8; j++) {
      await addBimbingan(skripsi.id, mhs[10].id, j % 2 === 0 ? amir.id : adi.id, `Bimbingan sesi ${j + 1}`, "DIVALIDASI", 160 - j * 10);
    }

    // Semhas LOLOS
    const semhasSidang = await createSidangWithPenguji(
      skripsi.id, "SEMINAR_HASIL", 1, "SELESAI", "LOLOS",
      [dyah.id, sri.id], dyah.id
    );
    await addBerkas(skripsi.id, mhs[10].id, "SIDANG_SOFTCOPY", "DISETUJUI", semhasSidang.id);
    await addBerkas(skripsi.id, mhs[10].id, "SIDANG_PRESENTASI", "DISETUJUI", semhasSidang.id);

    // Kompre dibuat, menunggu penguji
    await prisma.sidang.create({
      data: { skripsiId: skripsi.id, jenis: "SIDANG_KOMPRE", attemptNo: 1, status: "MENUNGGU_PENGUJI", createdById: dyah.id }
    });
  }

  // ============================================================
  // CASE 12 (Mhs 12): Sidang Kompre - dijadwalkan, menunggu nilai+hasil
  // Test: Penguji input nilai kompre, lalu input hasil
  // ============================================================
  console.log("📋 Case 12: Sidang Kompre - dijadwalkan, menunggu input nilai");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[11].id,
        peminatanId: getPeminatan(peminatanMapping[11]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[11],
        abstract: "Penelitian ini membahas visualisasi data geospasial.",
        tahap: "SIDANG_SKRIPSI",
        status: "MENUNGGU_KOMPRE",
        seminarApprovedAt: daysAgo(200),
        sidangApprovedAt: daysAgo(80)
      }
    });

    await createSidangWithPenguji(skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS", [amir.id, adi.id], dyah.id);
    await assignPembimbing(skripsi.id, [bambang.id, dyah.id], dyah.id);

    for (let j = 0; j < 8; j++) {
      await addBimbingan(skripsi.id, mhs[11].id, j % 2 === 0 ? bambang.id : dyah.id, `Bimbingan sesi ${j + 1}`, "DIVALIDASI", 180 - j * 10);
    }

    await createSidangWithPenguji(skripsi.id, "SEMINAR_HASIL", 1, "SELESAI", "LOLOS", [sri.id, bambang.id], dyah.id);

    const kompreSidang = await createSidangWithPenguji(
      skripsi.id, "SIDANG_KOMPRE", 1, "DIJADWALKAN", null,
      [amir.id, adi.id], dyah.id
    );

    if (ruang) {
      await createJadwal(skripsi.id, kompreSidang.id, ruang.id, dyah.id, -7);
    }
  }

  // ============================================================
  // CASE 13 (Mhs 13): Sidang Akhir - menunggu upload berkas final
  // Test: Mahasiswa upload FINAL_SKRIPSI, koordinator assign penguji
  // ============================================================
  console.log("📋 Case 13: Sidang Akhir - menunggu upload berkas final");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[12].id,
        peminatanId: getPeminatan(peminatanMapping[12]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[12],
        abstract: "Penelitian ini membahas pengembangan progressive web app.",
        tahap: "FINAL",
        status: "MENUNGGU_SIDANG_AKHIR",
        seminarApprovedAt: daysAgo(240),
        sidangApprovedAt: daysAgo(100)
      }
    });

    await createSidangWithPenguji(skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS", [bambang.id, sri.id], dyah.id);
    await assignPembimbing(skripsi.id, [adi.id, amir.id], dyah.id);

    for (let j = 0; j < 8; j++) {
      await addBimbingan(skripsi.id, mhs[12].id, j % 2 === 0 ? adi.id : amir.id, `Bimbingan sesi ${j + 1}`, "DIVALIDASI", 220 - j * 10);
    }

    await createSidangWithPenguji(skripsi.id, "SEMINAR_HASIL", 1, "SELESAI", "LOLOS", [dyah.id, bambang.id], dyah.id);
    await createSidangWithPenguji(skripsi.id, "SIDANG_KOMPRE", 1, "SELESAI", "LOLOS", [sri.id, amir.id], dyah.id);

    // Sidang Akhir dibuat - menunggu berkas FINAL_SKRIPSI
    await prisma.sidang.create({
      data: { skripsiId: skripsi.id, jenis: "SIDANG_AKHIR", attemptNo: 1, status: "MENUNGGU_BERKAS", createdById: dyah.id }
    });
  }

  // ============================================================
  // CASE 14 (Mhs 14): Sidang Akhir - dijadwalkan, menunggu keputusan LULUS/TIDAK
  // Test: Penguji input keputusan akhir
  // ============================================================
  console.log("📋 Case 14: Sidang Akhir - dijadwalkan, menunggu keputusan lulus");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[13].id,
        peminatanId: getPeminatan(peminatanMapping[13]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[13],
        abstract: "Penelitian ini membahas deteksi anomali pada network traffic.",
        tahap: "FINAL",
        status: "MENUNGGU_SIDANG_AKHIR",
        seminarApprovedAt: daysAgo(270),
        sidangApprovedAt: daysAgo(120)
      }
    });

    await createSidangWithPenguji(skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS", [adi.id, amir.id], dyah.id);
    await assignPembimbing(skripsi.id, [sri.id, bambang.id], dyah.id);

    for (let j = 0; j < 8; j++) {
      await addBimbingan(skripsi.id, mhs[13].id, j % 2 === 0 ? sri.id : bambang.id, `Bimbingan sesi ${j + 1}`, "DIVALIDASI", 250 - j * 10);
    }

    await createSidangWithPenguji(skripsi.id, "SEMINAR_HASIL", 1, "SELESAI", "LOLOS", [dyah.id, adi.id], dyah.id);
    await createSidangWithPenguji(skripsi.id, "SIDANG_KOMPRE", 1, "SELESAI", "LOLOS", [amir.id, bambang.id], dyah.id);

    const sidangAkhir = await createSidangWithPenguji(
      skripsi.id, "SIDANG_AKHIR", 1, "DIJADWALKAN", null,
      [dyah.id, sri.id], dyah.id
    );

    const berkasF = await addBerkas(skripsi.id, mhs[13].id, "FINAL_SKRIPSI", "DIAJUKAN", sidangAkhir.id);

    if (ruang) {
      await createJadwal(skripsi.id, sidangAkhir.id, ruang.id, dyah.id, -10);
    }
  }

  // ============================================================
  // CASE 15 (Mhs 15): LULUS SKRIPSI - semua tahap selesai (contoh lengkap)
  // Test: Dashboard menampilkan status lulus dengan nilai akhir
  // ============================================================
  console.log("📋 Case 15: LULUS SKRIPSI - semua tahap complete ✅");
  {
    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: mhs[14].id,
        peminatanId: getPeminatan(peminatanMapping[14]).id,
        jenisSkripsiId: jenisSkripsiList[0].id,
        title: skripsiTitles[14],
        abstract: "Penelitian ini membahas rancang bangun sistem monitoring kualitas udara.",
        tahap: "FINAL",
        status: "LULUS_SKRIPSI",
        seminarApprovedAt: daysAgo(300),
        sidangApprovedAt: daysAgo(150),
        selesaiAt: daysAgo(5),
        nilaiAkhir: 87.5,
        nilaiHuruf: "A"
      }
    });

    const semproSidang = await createSidangWithPenguji(skripsi.id, "SEMINAR_PROPOSAL", 1, "SELESAI", "LOLOS", [bambang.id, amir.id], dyah.id);
    await addBerkas(skripsi.id, mhs[14].id, "PROPOSAL", "DISETUJUI", semproSidang.id);
    await addBerkas(skripsi.id, mhs[14].id, "PRESENTASI", "DISETUJUI", semproSidang.id);

    await assignPembimbing(skripsi.id, [dyah.id, adi.id], dyah.id);

    for (let j = 0; j < 8; j++) {
      await addBimbingan(skripsi.id, mhs[14].id, j % 2 === 0 ? dyah.id : adi.id, `Bimbingan sesi ${j + 1}`, "DIVALIDASI", 280 - j * 10);
    }

    const semhasSidang = await createSidangWithPenguji(skripsi.id, "SEMINAR_HASIL", 1, "SELESAI", "LOLOS", [sri.id, bambang.id], dyah.id);
    await addBerkas(skripsi.id, mhs[14].id, "SIDANG_SOFTCOPY", "DISETUJUI", semhasSidang.id);
    await addBerkas(skripsi.id, mhs[14].id, "SIDANG_PRESENTASI", "DISETUJUI", semhasSidang.id);

    const kompreSidang = await createSidangWithPenguji(skripsi.id, "SIDANG_KOMPRE", 1, "SELESAI", "LOLOS", [amir.id, adi.id], dyah.id);
    await addNilai(skripsi.id, kompreSidang.id, amir.id, "kompre", 85, 30);
    await addNilai(skripsi.id, kompreSidang.id, adi.id, "kompre", 88, 30);

    const sidangAkhir = await createSidangWithPenguji(skripsi.id, "SIDANG_AKHIR", 1, "SELESAI", "LULUS", [dyah.id, sri.id], dyah.id);
    await addBerkas(skripsi.id, mhs[14].id, "FINAL_SKRIPSI", "DISETUJUI", sidangAkhir.id);
    await addBerkas(skripsi.id, mhs[14].id, "LEMBAR_PENGESAHAN", "DISETUJUI");

    await addNilai(skripsi.id, sidangAkhir.id, dyah.id, "sidang", 90, 40);
    await addNilai(skripsi.id, sidangAkhir.id, sri.id, "sidang", 85, 40);

    if (ruang) {
      await createJadwal(skripsi.id, sidangAkhir.id, ruang.id, dyah.id, 5, "SELESAI");
    }

    // Gamification
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
  console.log("\n📊 Distribusi 15 mahasiswa ke berbagai case:\n");
  console.log("  Case 1  (4519210001 - Andi Pratama)      → Baru daftar, belum upload berkas sempro");
  console.log("  Case 2  (4519210002 - Budi Santoso)      → Sempro: berkas uploaded, menunggu assign penguji");
  console.log("  Case 3  (4519210003 - Citra Dewi)        → Sempro: penguji assigned, menunggu jadwal");
  console.log("  Case 4  (4519210004 - Dian Purnama)      → Sempro: dijadwalkan, menunggu input hasil");
  console.log("  Case 5  (4519210005 - Eka Saputra)       → Sempro LOLOS, menunggu assign pembimbing");
  console.log("  Case 6  (4519210006 - Fajar Hidayat)     → Bimbingan: 3x valid (ada yg DIAJUKAN & SELESAI)");
  console.log("  Case 7  (4519210007 - Gita Rahmawati)    → Bimbingan: 8x valid ⭐ SIAP approve maju semhas");
  console.log("  Case 8  (4519210008 - Hendra Wijaya)     → Semhas: menunggu upload berkas");
  console.log("  Case 9  (4519210009 - Intan Permata)     → Semhas: dijadwalkan, menunggu nilai & hasil");
  console.log("  Case 10 (4519210010 - Joko Susilo)       → Semhas: hasil REVISI, menunggu upload revisi");
  console.log("  Case 11 (4519210011 - Karina Putri)      → Kompre: menunggu assign penguji");
  console.log("  Case 12 (4519210012 - Luthfi Rahman)     → Kompre: dijadwalkan, menunggu input nilai");
  console.log("  Case 13 (4519210013 - Maya Anggraini)    → Sidang Akhir: menunggu upload FINAL_SKRIPSI");
  console.log("  Case 14 (4519210014 - Naufal Hakim)      → Sidang Akhir: dijadwalkan, menunggu keputusan");
  console.log("  Case 15 (4519210015 - Olivia Sari)       → LULUS SKRIPSI ✅ (semua tahap selesai)");
  console.log("\n👨‍🏫 Dosen: dyah_s, bambang_r, amir_m, adi_w, sri_r");
  console.log("👨‍💼 Staff: ridho_a (admin+staf), wahyu_a (staf)");
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
