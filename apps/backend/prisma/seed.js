import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

const requiredEnv = [
  "SEED_ADMIN_IDENTIFIER",
  "SEED_ADMIN_NAME",
  "SEED_ADMIN_EMAIL",
  "SEED_ADMIN_PASSWORD",
  "BCRYPT_SALT_ROUNDS"
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required seed environment variable: ${key}`);
  }
}

const roles = [
  {
    slug: "admin",
    name: "Administrator",
    description: "Kontrol penuh sistem dan keamanan"
  },
  {
    slug: "mahasiswa",
    name: "Mahasiswa Skripsi",
    description: "Mahasiswa aktif yang sedang menjalani proses skripsi"
  },
  {
    slug: "dosen_reguler",
    name: "Dosen Reguler",
    description: "Dosen yang memiliki akses informasi umum"
  },
  {
    slug: "dosen_pembimbing",
    name: "Dosen Pembimbing",
    description: "Dosen yang membimbing mahasiswa skripsi"
  },
  {
    slug: "dosen_penguji",
    name: "Dosen Penguji",
    description: "Dosen yang melakukan review dan penilaian sidang"
  },
  {
    slug: "dosen_koordinator",
    name: "Dosen Koordinator Skripsi",
    description: "Dosen yang mengatur assignment dan jadwal skripsi"
  },
  {
    slug: "ketua_prodi",
    name: "Ketua Prodi",
    description: "Pimpinan prodi yang mengelola user, laporan, dan approval final"
  },
  {
    slug: "staf_prodi",
    name: "Staf Prodi",
    description: "Staf administrasi prodi untuk agenda dan peminjaman ruang"
  },

];

const permissions = [
  ["auth.login", "auth", "login", "Login ke sistem"],
  ["profile.read", "profile", "read", "Lihat profil"],
  ["profile.update", "profile", "update", "Edit profil"],

  ["user.read", "user", "read", "Lihat user"],
  ["user.create", "user", "create", "Tambah user"],
  ["user.update", "user", "update", "Edit user"],
  ["user.delete", "user", "delete", "Hapus/nonaktifkan user"],
  ["user.assign_role", "user", "assign_role", "Assign role user"],
  [
    "user.delete_permanent",
    "user",
    "delete_permanent",
    "Hapus permanen user"
  ],

  ["public_schedule.read", "public_schedule", "read", "Lihat dashboard publik"],

  ["master_data.read", "master_data", "read", "Lihat master data"],
  ["master_data.manage", "master_data", "manage", "Kelola master data"],
  [
    "master_data.delete_permanent",
    "master_data",
    "delete_permanent",
    "Hapus permanen master data"
  ],

  ["skripsi.read", "skripsi", "read", "Lihat skripsi"],
  ["skripsi.create", "skripsi", "create", "Daftar skripsi/seminar"],
  ["skripsi.update", "skripsi", "update", "Update data skripsi"],
  ["skripsi.assign_dosen", "skripsi", "assign_dosen", "Assign dosen skripsi"],
  ["skripsi.approve_final", "skripsi", "approve_final", "Approve berkas final"],
  ["skripsi.approve_sidang", "skripsi", "approve_sidang", "Approve mahasiswa maju sidang"],
  [
    "skripsi.delete_permanent",
    "skripsi",
    "delete_permanent",
    "Hapus permanen skripsi"
  ],

  ["berkas.upload", "berkas", "upload", "Upload berkas"],
  ["berkas.review", "berkas", "review", "Review berkas"],
  ["berkas.download", "berkas", "download", "Download berkas"],

  ["seminar.review", "seminar", "review", "Review seminar proposal"],
  ["seminar.approve", "seminar", "approve", "Approve seminar proposal"],

  ["bimbingan.create", "bimbingan", "create", "Ajukan bimbingan"],
  ["bimbingan.confirm", "bimbingan", "confirm", "Konfirmasi bimbingan"],
  ["bimbingan.validate", "bimbingan", "validate", "Validasi bimbingan"],
  ["bimbingan.read", "bimbingan", "read", "Lihat bimbingan"],

  ["jadwal_sidang.read", "jadwal_sidang", "read", "Lihat jadwal sidang"],
  ["jadwal_sidang.manage", "jadwal_sidang", "manage", "Kelola jadwal sidang"],
  [
  "jadwal_sidang.delete_permanent",
  "jadwal_sidang",
  "delete_permanent",
  "Hapus permanen jadwal sidang"
  ],

  ["ruang.read", "ruang", "read", "Lihat ruang"],
  ["ruang.borrow", "ruang", "borrow", "Ajukan peminjaman ruang"],
  ["ruang.approve", "ruang", "approve", "Approve/reject peminjaman ruang"],
  ["ruang.manage", "ruang", "manage", "Kelola master ruang"],
  [
  "ruang.delete_permanent",
  "ruang",
  "delete_permanent",
  "Hapus permanen peminjaman ruang"
  ],  

  ["nilai.input", "nilai", "input", "Input nilai sidang"],
  ["nilai.read", "nilai", "read", "Lihat nilai sidang"],
  [
  "nilai.delete_permanent",
  "nilai",
  "delete_permanent",
  "Hapus permanen nilai sidang"
  ],

  ["revisi.create", "revisi", "create", "Buat catatan revisi"],
  ["revisi.upload", "revisi", "upload", "Upload revisi"],
  ["revisi.approve", "revisi", "approve", "Approve revisi"],
  [
    "finalisasi.delete_permanent",
    "finalisasi",
    "delete_permanent",
    "Hapus permanen data finalisasi"
  ],
  [
    "revisi.delete_permanent",
    "revisi",
    "delete_permanent",
    "Hapus permanen revisi"
  ],

  ["gamification.read", "gamification", "read", "Lihat gamification"],
  ["gamification.manage", "gamification", "manage", "Kelola gamification"],

  ["laporan.read", "laporan", "read", "Lihat laporan"],
  ["laporan.export", "laporan", "export", "Export laporan"],

  ["notification.read", "notification", "read", "Lihat notifikasi"],
  ["notification.manage", "notification", "manage", "Kelola notifikasi"],

  ["audit.read", "audit", "read", "Lihat audit log sistem"]
];

const rolePermissionMap = {
  admin: permissions.map(([slug]) => slug),

  mahasiswa: [
    "auth.login",
    "profile.read",
    "profile.update",
    "public_schedule.read",
    "master_data.read",
    "skripsi.read",
    "skripsi.create",
    "berkas.upload",
    "berkas.download",
    "bimbingan.create",
    "bimbingan.read",
    "jadwal_sidang.read",
    "ruang.read",
    "ruang.borrow",
    "nilai.read",
    "revisi.upload",
    "gamification.read",
    "notification.read",
    "bimbingan.validate",
  ],

  dosen_reguler: [
    "auth.login",
    "profile.read",
    "profile.update",
    "public_schedule.read",
    "jadwal_sidang.read",
    "notification.read"
  ],

  dosen_pembimbing: [
    "auth.login",
    "profile.read",
    "profile.update",
    "public_schedule.read",
    "skripsi.read",
    "berkas.review",
    "berkas.download",
    "bimbingan.confirm",
    "bimbingan.validate",
    "bimbingan.read",
    "jadwal_sidang.read",
    "nilai.input",
    "nilai.read",
    "revisi.create",
    "revisi.approve",
    "gamification.read",
    "gamification.manage",
    "notification.read",
    "skripsi.approve_sidang",
  ],

  dosen_penguji: [
    "auth.login",
    "profile.read",
    "profile.update",
    "public_schedule.read",
    "skripsi.read",
    "berkas.review",
    "berkas.download",
    "seminar.review",
    "seminar.approve",
    "jadwal_sidang.read",
    "nilai.input",
    "nilai.read",
    "revisi.create",
    "revisi.approve",
    "notification.read",
    "berkas.upload",
  ],

  dosen_koordinator: [
    "auth.login",
    "profile.read",
    "profile.update",
    "public_schedule.read",
    "master_data.read",
    "skripsi.read",
    "skripsi.update",
    "skripsi.assign_dosen",
    "jadwal_sidang.read",
    "jadwal_sidang.manage",
    "ruang.read",
    "nilai.read",
    "laporan.read",
    "notification.read",
    "berkas.download"
  ],

  ketua_prodi: [
    "auth.login",
    "profile.read",
    "profile.update",
    "public_schedule.read",
    "user.read",
    "user.create",
    "user.update",
    "user.delete",
    "user.assign_role",
    "master_data.read",
    "master_data.manage",
    "skripsi.read",
    "skripsi.assign_dosen",
    "skripsi.approve_final",
    "jadwal_sidang.read",
    "jadwal_sidang.manage",
    "nilai.read",
    "laporan.read",
    "laporan.export",
    "notification.read",
    "berkas.download",
    "audit.read",
    "skripsi.update"
  ],

  staf_prodi: [
    "auth.login",
    "profile.read",
    "profile.update",
    "public_schedule.read",
    "master_data.read",
    "jadwal_sidang.read",
    "ruang.read",
    "ruang.approve",
    "ruang.manage",
    "notification.read",
    "berkas.download"
  ]
};

const peminatan = [
  { slug: "ai", name: "Artificial Intelligence", description: "Peminatan AI" },
  { slug: "ncs", name: "Network and Cyber Security", description: "Peminatan NCS" },
  { slug: "ds", name: "Data Science", description: "Peminatan Data Science" },
  { slug: "se", name: "Software Engineering", description: "Peminatan Software Engineering" }
];

const jenisSkripsi = [
  { slug: "seminar_proposal", name: "Seminar Proposal", description: "Tahap seminar proposal" },
  { slug: "sidang_komprehensif", name: "Sidang Komprehensif", description: "Tahap sidang komprehensif" },
  { slug: "sidang_skripsi", name: "Sidang Skripsi", description: "Tahap sidang skripsi" }
];

const rooms = [
  {
    code: "R-101",
    name: "Ruang Sidang 101",
    type: "Ruang Sidang",
    capacity: 20,
    facilities: "Meja sidang, proyektor, AC"
  },
  {
    code: "LAB-FTI-1",
    name: "Laboratorium FTI 1",
    type: "Laboratorium",
    capacity: 30,
    facilities: "Komputer, proyektor, jaringan"
  },
  {
    code: "AULA-FTI",
    name: "Aula FTI",
    type: "Aula",
    capacity: 80,
    facilities: "Sound system, proyektor, AC"
  }
];

const gradingScales = [
  { letter: "A", minScore: 85, maxScore: 100 },
  { letter: "A-", minScore: 80, maxScore: 84.99 },
  { letter: "B+", minScore: 75, maxScore: 79.99 },
  { letter: "B", minScore: 70, maxScore: 74.99 },
  { letter: "C", minScore: 60, maxScore: 69.99 },
  { letter: "D", minScore: 50, maxScore: 59.99 },
  { letter: "E", minScore: 0, maxScore: 49.99 }
];

const badges = [
  {
    slug: "seminar_submitted",
    name: "Proposal Submitted",
    description: "Mahasiswa berhasil mengajukan seminar proposal"
  },
  {
    slug: "bimbingan_8x",
    name: "Bimbingan 8x",
    description: "Mahasiswa menyelesaikan minimal 8 kali bimbingan valid"
  },
  {
    slug: "sidang_ready",
    name: "Siap Sidang",
    description: "Mahasiswa telah memenuhi syarat maju sidang"
  },
  {
    slug: "final_approved",
    name: "Final Approved",
    description: "Berkas final telah disetujui"
  }
];

async function seedRoles() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: {
        name: role.name,
        description: role.description
      },
      create: role
    });
  }
}

async function seedPermissions() {
  for (const [slug, module, action, name] of permissions) {
    await prisma.permission.upsert({
      where: { slug },
      update: { module, action, name },
      create: { slug, module, action, name }
    });
  }
}

async function seedRolePermissions() {
  for (const [roleSlug, permissionSlugs] of Object.entries(rolePermissionMap)) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { slug: roleSlug }
    });

    for (const permissionSlug of permissionSlugs) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { slug: permissionSlug }
      });

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }
  }
}

async function seedMasterData() {
  for (const item of peminatan) {
    await prisma.peminatan.upsert({
      where: { slug: item.slug },
      update: item,
      create: item
    });
  }

  for (const item of jenisSkripsi) {
    await prisma.jenisSkripsi.upsert({
      where: { slug: item.slug },
      update: item,
      create: item
    });
  }

  for (const room of rooms) {
    await prisma.masterRuang.upsert({
      where: { code: room.code },
      update: room,
      create: room
    });
  }

  for (const scale of gradingScales) {
    const existing = await prisma.gradingScale.findFirst({
      where: {
        letter: scale.letter,
        minScore: scale.minScore,
        maxScore: scale.maxScore
      }
    });

    if (!existing) {
      await prisma.gradingScale.create({
        data: scale
      });
    }
  }

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: badge,
      create: badge
    });
  }
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD,
    Number(process.env.BCRYPT_SALT_ROUNDS)
  );

  const adminUser = await prisma.user.upsert({
    where: {
      identifier: process.env.SEED_ADMIN_IDENTIFIER
    },
    update: {
      name: process.env.SEED_ADMIN_NAME,
      email: process.env.SEED_ADMIN_EMAIL,
      passwordHash,
      status: "ACTIVE"
    },
    create: {
      identifier: process.env.SEED_ADMIN_IDENTIFIER,
      name: process.env.SEED_ADMIN_NAME,
      email: process.env.SEED_ADMIN_EMAIL,
      passwordHash,
      status: "ACTIVE",
      profile: {
        create: {}
      }
    }
  });

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { slug: "admin" }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id
    }
  });
}

async function main() {
  console.log("Seeding roles...");
  await seedRoles();

  console.log("Seeding permissions...");
  await seedPermissions();

  console.log("Seeding role permissions...");
  await seedRolePermissions();

  console.log("Seeding master data...");
  await seedMasterData();

  console.log("Seeding admin user...");
  await seedAdmin();

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });