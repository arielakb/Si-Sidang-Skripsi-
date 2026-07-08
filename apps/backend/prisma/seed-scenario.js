import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

const defaultPassword = "pancasila123";

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

const students = Array.from({ length: 15 }, (_, i) => ({
  identifier: `45192100${String(i + 1).padStart(2, "0")}`,
  name: `Mahasiswa IT ${i + 1}`,
  roles: ["mahasiswa"]
}));

async function clearData() {
  console.log("Menghapus data skenario sebelumnya...");
  await prisma.skripsiDosen.deleteMany({});
  await prisma.sidangDosen.deleteMany({});
  await prisma.jadwalSidang.deleteMany({});
  await prisma.nilaiSidang.deleteMany({});
  await prisma.revisi.deleteMany({});
  await prisma.berkas.deleteMany({});
  await prisma.bimbinganLog.deleteMany({});
  await prisma.sidang.deleteMany({});
  await prisma.skripsi.deleteMany({});
  
  // Hapus semua user kecuali admin bawaan
  const adminIdentifier = process.env.SEED_ADMIN_IDENTIFIER || "admin";
  await prisma.user.deleteMany({
    where: {
      identifier: { not: adminIdentifier }
    }
  });
}

async function createUser(userData) {
  const passwordHash = await bcrypt.hash(defaultPassword, Number(process.env.BCRYPT_SALT_ROUNDS) || 10);
  const email = `${userData.identifier}@univpancasila.ac.id`.toLowerCase();

  const user = await prisma.user.create({
    data: {
      identifier: userData.identifier,
      name: userData.name,
      email: email,
      passwordHash,
      status: "ACTIVE",
      profile: {
        create: {}
      }
    }
  });

  for (const roleSlug of userData.roles) {
    const role = await prisma.role.findUnique({ where: { slug: roleSlug } });
    if (role) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id
        }
      });
    }
  }

  return user;
}

async function main() {
  await clearData();

  console.log("Membuat Dosen dan Staff...");
  const createdLecturers = [];
  for (const lecturer of lecturers) {
    createdLecturers.push(await createUser(lecturer));
  }

  const createdStaffs = [];
  for (const staff of staffs) {
    createdStaffs.push(await createUser(staff));
  }

  console.log("Membuat 15 Mahasiswa...");
  const createdStudents = [];
  for (const student of students) {
    createdStudents.push(await createUser(student));
  }

  console.log("Distribusi Peminatan dan Tahap Skripsi...");
  const peminatanList = await prisma.peminatan.findMany();
  const jenisSkripsiList = await prisma.jenisSkripsi.findMany();
  
  if (peminatanList.length === 0 || jenisSkripsiList.length === 0) {
    console.error("Master data Peminatan/Jenis Skripsi belum ada! Harap jalankan 'npx prisma db seed' (seed.js) terlebih dahulu.");
    return;
  }

  const stages = [
    { tahap: "SEMINAR_PROPOSAL", status: "MENUNGGU_JADWAL" },
    { tahap: "FINAL", status: "BIMBINGAN" },
    { tahap: "FINAL", status: "MENUNGGU_SEMINAR_HASIL" },
    { tahap: "FINAL", status: "MENUNGGU_KOMPRE" },
    { tahap: "FINAL", status: "LULUS_SKRIPSI" }
  ];

  for (let i = 0; i < createdStudents.length; i++) {
    const student = createdStudents[i];
    const peminatan = peminatanList[i % peminatanList.length];
    const jenisSkripsi = jenisSkripsiList[0]; 
    const stage = stages[Math.floor(i / 3)];

    const skripsi = await prisma.skripsi.create({
      data: {
        mahasiswaId: student.id,
        peminatanId: peminatan.id,
        jenisSkripsiId: jenisSkripsi.id,
        title: `Implementasi Sistem IT Modern by ${student.name}`,
        abstract: `Abstrak dari skripsi yang dikerjakan oleh ${student.name}.`,
        tahap: stage.tahap,
        status: stage.status
      }
    });

    // Helper untuk dummy berkas
    const addBerkas = async (kategori, status) => {
      await prisma.berkas.create({
        data: {
          skripsiId: skripsi.id,
          uploadedById: student.id,
          kategori,
          status,
          originalName: `dummy_${kategori.toLowerCase()}.pdf`,
          fileName: `dummy_${kategori.toLowerCase()}_${Date.now()}.pdf`,
          mimeType: "application/pdf",
          sizeBytes: 102400,
          path: `/uploads/dummy_${kategori.toLowerCase()}.pdf`,
        }
      });
    };

    // Helper untuk dummy bimbingan
    const addBimbingan = async (pembimbing, topik, status, offsetDays) => {
      const tgl = new Date();
      tgl.setDate(tgl.getDate() - offsetDays);
      await prisma.bimbinganLog.create({
        data: {
          skripsiId: skripsi.id,
          mahasiswaId: student.id,
          dosenId: pembimbing.id,
          tanggalPengajuan: tgl,
          jadwalMulai: tgl,
          jadwalSelesai: new Date(tgl.getTime() + 60 * 60 * 1000),
          topik,
          hasil: status === "DIVALIDASI" ? "Revisi telah diperbaiki." : "Silakan lanjut bab berikutnya.",
          status,
          catatanDosen: status === "DIVALIDASI" ? "ACC untuk bab ini." : "Harap perbaiki sesuai catatan.",
          catatanMahasiswa: "Berikut draft bab yang sudah saya kerjakan Pak/Bu.",
          validatedAt: status === "DIVALIDASI" ? new Date(tgl.getTime() + 2 * 60 * 60 * 1000) : null
        }
      });
    };

    if (stage.status !== "MENUNGGU_JADWAL") {
      await addBerkas("PROPOSAL", "DISETUJUI");
      
      const pembimbing1 = createdLecturers[i % createdLecturers.length];
      const pembimbing2 = createdLecturers[(i + 1) % createdLecturers.length];

      await prisma.skripsiDosen.create({
        data: { skripsiId: skripsi.id, dosenId: pembimbing1.id, peran: "PEMBIMBING" }
      });
      await prisma.skripsiDosen.create({
        data: { skripsiId: skripsi.id, dosenId: pembimbing2.id, peran: "PEMBIMBING" }
      });

      // Tambahkan bimbingan dummy
      let bimbinganCount = 2; // Default untuk BIMBINGAN (baru mulai)
      if (["MENUNGGU_SEMINAR_HASIL", "MENUNGGU_KOMPRE", "LULUS_SKRIPSI"].includes(stage.status)) {
        bimbinganCount = 8; // 8x bimbingan per dosen untuk memenuhi syarat lanjut sidang
      }
      
      for (let j = 1; j <= bimbinganCount; j++) {
        await addBimbingan(pembimbing1, `Bimbingan Bab ${Math.ceil(j/2)} dengan Pembimbing 1`, "DIVALIDASI", bimbinganCount - j + 10);
        await addBimbingan(pembimbing2, `Bimbingan Bab ${Math.ceil(j/2)} dengan Pembimbing 2`, "DIVALIDASI", bimbinganCount - j + 10);
      }
    } else {
      await addBerkas("PROPOSAL", "DIAJUKAN");
      await addBerkas("PRESENTASI", "DIAJUKAN");
    }

    if (stage.status === "MENUNGGU_SEMINAR_HASIL" || stage.status === "MENUNGGU_KOMPRE") {
      await addBerkas("SIDANG_SOFTCOPY", "DIAJUKAN");
      await addBerkas("SIDANG_PRESENTASI", "DIAJUKAN");
    }

    if (stage.status === "LULUS_SKRIPSI") {
      await addBerkas("FINAL_SKRIPSI", "DISETUJUI");
      await addBerkas("LEMBAR_PENGESAHAN", "DISETUJUI");

      const sidang = await prisma.sidang.create({
        data: {
          skripsiId: skripsi.id,
          jenis: "SIDANG_AKHIR",
          attemptNo: 1,
          status: "SELESAI",
          hasil: "LULUS"
        }
      });

      const penguji1 = createdLecturers[(i + 2) % createdLecturers.length];
      const penguji2 = createdLecturers[(i + 3) % createdLecturers.length];

      await prisma.sidangDosen.create({
        data: { sidangId: sidang.id, dosenId: penguji1.id, peran: "PENGUJI" }
      });
      await prisma.sidangDosen.create({
        data: { sidangId: sidang.id, dosenId: penguji2.id, peran: "PENGUJI" }
      });
    }
  }

  console.log("Skenario Seed Selesai!");
  console.log("Password default untuk semua user skenario: " + defaultPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
