-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SkripsiTahap" AS ENUM ('SEMINAR_PROPOSAL', 'KOMPRE', 'SIDANG_SKRIPSI', 'FINAL');

-- CreateEnum
CREATE TYPE "SkripsiStatus" AS ENUM ('MENUNGGU_BERKAS', 'MENUNGGU_APPROVAL', 'MENUNGGU_JADWAL', 'SIAP_SIDANG', 'EVALUASI_SIDANG', 'MENUNGGU_REVISI', 'MENUNGGU_FINAL', 'SELESAI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "DosenSkripsiPeran" AS ENUM ('PEMBIMBING', 'PENGUJI', 'KOORDINATOR');

-- CreateEnum
CREATE TYPE "BerkasKategori" AS ENUM ('PROPOSAL', 'PRESENTASI', 'SEMINAR_REVISI', 'SIDANG_SOFTCOPY', 'SIDANG_PRESENTASI', 'PENDUKUNG', 'REVISI', 'FINAL_PDF', 'SOURCE_CODE', 'PENGESAHAN', 'FOTO_PROFIL', 'SURAT_PERJANJIAN');

-- CreateEnum
CREATE TYPE "BerkasStatus" AS ENUM ('DRAFT', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK', 'REVISI');

-- CreateEnum
CREATE TYPE "BimbinganStatus" AS ENUM ('DIAJUKAN', 'DISETUJUI', 'DITOLAK', 'SELESAI', 'DIVALIDASI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "JadwalSidangStatus" AS ENUM ('DIJADWALKAN', 'BERLANGSUNG', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "PeminjamanRuangStatus" AS ENUM ('DIAJUKAN', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "RevisiStatus" AS ENUM ('MENUNGGU_DIAJUKAN', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "NotifikasiStatus" AS ENUM ('UNREAD', 'READ');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "npm" TEXT,
    "nip" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "photoPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "peminatan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peminatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jenis_skripsi" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jenis_skripsi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_ruang" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "capacity" INTEGER,
    "facilities" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_ruang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_scales" (
    "id" TEXT NOT NULL,
    "letter" TEXT NOT NULL,
    "minScore" DECIMAL(5,2) NOT NULL,
    "maxScore" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grading_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skripsi" (
    "id" TEXT NOT NULL,
    "mahasiswaId" TEXT NOT NULL,
    "peminatanId" TEXT,
    "jenisSkripsiId" TEXT,
    "title" TEXT,
    "abstract" TEXT,
    "tahap" "SkripsiTahap" NOT NULL DEFAULT 'SEMINAR_PROPOSAL',
    "status" "SkripsiStatus" NOT NULL DEFAULT 'MENUNGGU_BERKAS',
    "seminarApprovedAt" TIMESTAMP(3),
    "selesaiAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skripsi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skripsi_dosen" (
    "id" TEXT NOT NULL,
    "skripsiId" TEXT NOT NULL,
    "dosenId" TEXT NOT NULL,
    "peran" "DosenSkripsiPeran" NOT NULL,
    "bobotNilai" DECIMAL(5,2),
    "assignedById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skripsi_dosen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "berkas" (
    "id" TEXT NOT NULL,
    "skripsiId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "kategori" "BerkasKategori" NOT NULL,
    "status" "BerkasStatus" NOT NULL DEFAULT 'DIAJUKAN',
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "path" TEXT NOT NULL,
    "catatan" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "berkas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kode_etik" (
    "id" TEXT NOT NULL,
    "skripsiId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "statementVersion" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kode_etik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surat_perjanjian" (
    "id" TEXT NOT NULL,
    "skripsiId" TEXT NOT NULL,
    "berkasId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surat_perjanjian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bimbingan_logs" (
    "id" TEXT NOT NULL,
    "skripsiId" TEXT NOT NULL,
    "mahasiswaId" TEXT NOT NULL,
    "dosenId" TEXT NOT NULL,
    "tanggalPengajuan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jadwalMulai" TIMESTAMP(3),
    "jadwalSelesai" TIMESTAMP(3),
    "topik" TEXT NOT NULL,
    "hasil" TEXT,
    "status" "BimbinganStatus" NOT NULL DEFAULT 'DIAJUKAN',
    "catatanDosen" TEXT,
    "catatanMahasiswa" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bimbingan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal_sidang" (
    "id" TEXT NOT NULL,
    "skripsiId" TEXT NOT NULL,
    "ruangId" TEXT,
    "dibuatOlehId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "waktuMulai" TIMESTAMP(3) NOT NULL,
    "waktuSelesai" TIMESTAMP(3) NOT NULL,
    "tempatManual" TEXT,
    "linkVicon" TEXT,
    "status" "JadwalSidangStatus" NOT NULL DEFAULT 'DIJADWALKAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jadwal_sidang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nilai_sidang" (
    "id" TEXT NOT NULL,
    "skripsiId" TEXT NOT NULL,
    "dosenId" TEXT NOT NULL,
    "nilaiAngka" DECIMAL(5,2) NOT NULL,
    "bobot" DECIMAL(5,2) NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nilai_sidang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revisi" (
    "id" TEXT NOT NULL,
    "skripsiId" TEXT NOT NULL,
    "dibuatOlehId" TEXT NOT NULL,
    "berkasId" TEXT,
    "catatan" TEXT NOT NULL,
    "status" "RevisiStatus" NOT NULL DEFAULT 'MENUNGGU_DIAJUKAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peminjaman_ruang" (
    "id" TEXT NOT NULL,
    "skripsiId" TEXT,
    "mahasiswaId" TEXT NOT NULL,
    "ruangId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "waktuMulai" TIMESTAMP(3) NOT NULL,
    "waktuSelesai" TIMESTAMP(3) NOT NULL,
    "keperluan" TEXT NOT NULL,
    "status" "PeminjamanRuangStatus" NOT NULL DEFAULT 'DIAJUKAN',
    "alasan" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peminjaman_ruang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengesahan" (
    "id" TEXT NOT NULL,
    "skripsiId" TEXT NOT NULL,
    "berkasId" TEXT,
    "approvedById" TEXT NOT NULL,
    "catatan" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pengesahan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifikasi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT,
    "status" "NotifikasiStatus" NOT NULL DEFAULT 'UNREAD',
    "entityType" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_aktivitas" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_aktivitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification" (
    "id" TEXT NOT NULL,
    "skripsiId" TEXT NOT NULL,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "awardedBy" TEXT,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "period" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_identifier_key" ON "users"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_slug_key" ON "permissions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "peminatan_slug_key" ON "peminatan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "jenis_skripsi_slug_key" ON "jenis_skripsi"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "master_ruang_code_key" ON "master_ruang"("code");

-- CreateIndex
CREATE INDEX "skripsi_mahasiswaId_idx" ON "skripsi"("mahasiswaId");

-- CreateIndex
CREATE INDEX "skripsi_status_idx" ON "skripsi"("status");

-- CreateIndex
CREATE INDEX "skripsi_tahap_idx" ON "skripsi"("tahap");

-- CreateIndex
CREATE INDEX "skripsi_dosen_dosenId_idx" ON "skripsi_dosen"("dosenId");

-- CreateIndex
CREATE UNIQUE INDEX "skripsi_dosen_skripsiId_dosenId_peran_key" ON "skripsi_dosen"("skripsiId", "dosenId", "peran");

-- CreateIndex
CREATE INDEX "berkas_skripsiId_idx" ON "berkas"("skripsiId");

-- CreateIndex
CREATE INDEX "berkas_kategori_idx" ON "berkas"("kategori");

-- CreateIndex
CREATE INDEX "berkas_status_idx" ON "berkas"("status");

-- CreateIndex
CREATE INDEX "kode_etik_skripsiId_idx" ON "kode_etik"("skripsiId");

-- CreateIndex
CREATE UNIQUE INDEX "surat_perjanjian_berkasId_key" ON "surat_perjanjian"("berkasId");

-- CreateIndex
CREATE INDEX "surat_perjanjian_skripsiId_idx" ON "surat_perjanjian"("skripsiId");

-- CreateIndex
CREATE INDEX "bimbingan_logs_skripsiId_idx" ON "bimbingan_logs"("skripsiId");

-- CreateIndex
CREATE INDEX "bimbingan_logs_mahasiswaId_idx" ON "bimbingan_logs"("mahasiswaId");

-- CreateIndex
CREATE INDEX "bimbingan_logs_dosenId_idx" ON "bimbingan_logs"("dosenId");

-- CreateIndex
CREATE INDEX "bimbingan_logs_status_idx" ON "bimbingan_logs"("status");

-- CreateIndex
CREATE INDEX "jadwal_sidang_tanggal_idx" ON "jadwal_sidang"("tanggal");

-- CreateIndex
CREATE INDEX "jadwal_sidang_ruangId_idx" ON "jadwal_sidang"("ruangId");

-- CreateIndex
CREATE INDEX "jadwal_sidang_status_idx" ON "jadwal_sidang"("status");

-- CreateIndex
CREATE INDEX "nilai_sidang_skripsiId_idx" ON "nilai_sidang"("skripsiId");

-- CreateIndex
CREATE UNIQUE INDEX "nilai_sidang_skripsiId_dosenId_key" ON "nilai_sidang"("skripsiId", "dosenId");

-- CreateIndex
CREATE UNIQUE INDEX "revisi_berkasId_key" ON "revisi"("berkasId");

-- CreateIndex
CREATE INDEX "revisi_skripsiId_idx" ON "revisi"("skripsiId");

-- CreateIndex
CREATE INDEX "revisi_status_idx" ON "revisi"("status");

-- CreateIndex
CREATE INDEX "peminjaman_ruang_ruangId_idx" ON "peminjaman_ruang"("ruangId");

-- CreateIndex
CREATE INDEX "peminjaman_ruang_tanggal_idx" ON "peminjaman_ruang"("tanggal");

-- CreateIndex
CREATE INDEX "peminjaman_ruang_status_idx" ON "peminjaman_ruang"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pengesahan_skripsiId_key" ON "pengesahan"("skripsiId");

-- CreateIndex
CREATE UNIQUE INDEX "pengesahan_berkasId_key" ON "pengesahan"("berkasId");

-- CreateIndex
CREATE INDEX "notifikasi_userId_idx" ON "notifikasi"("userId");

-- CreateIndex
CREATE INDEX "notifikasi_status_idx" ON "notifikasi"("status");

-- CreateIndex
CREATE INDEX "log_aktivitas_actorId_idx" ON "log_aktivitas"("actorId");

-- CreateIndex
CREATE INDEX "log_aktivitas_action_idx" ON "log_aktivitas"("action");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_skripsiId_key" ON "gamification"("skripsiId");

-- CreateIndex
CREATE UNIQUE INDEX "badges_slug_key" ON "badges"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_userId_badgeId_key" ON "user_badges"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "missions_slug_key" ON "missions"("slug");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skripsi" ADD CONSTRAINT "skripsi_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skripsi" ADD CONSTRAINT "skripsi_peminatanId_fkey" FOREIGN KEY ("peminatanId") REFERENCES "peminatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skripsi" ADD CONSTRAINT "skripsi_jenisSkripsiId_fkey" FOREIGN KEY ("jenisSkripsiId") REFERENCES "jenis_skripsi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skripsi_dosen" ADD CONSTRAINT "skripsi_dosen_skripsiId_fkey" FOREIGN KEY ("skripsiId") REFERENCES "skripsi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skripsi_dosen" ADD CONSTRAINT "skripsi_dosen_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skripsi_dosen" ADD CONSTRAINT "skripsi_dosen_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "berkas" ADD CONSTRAINT "berkas_skripsiId_fkey" FOREIGN KEY ("skripsiId") REFERENCES "skripsi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "berkas" ADD CONSTRAINT "berkas_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "berkas" ADD CONSTRAINT "berkas_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kode_etik" ADD CONSTRAINT "kode_etik_skripsiId_fkey" FOREIGN KEY ("skripsiId") REFERENCES "skripsi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kode_etik" ADD CONSTRAINT "kode_etik_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_perjanjian" ADD CONSTRAINT "surat_perjanjian_skripsiId_fkey" FOREIGN KEY ("skripsiId") REFERENCES "skripsi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_perjanjian" ADD CONSTRAINT "surat_perjanjian_berkasId_fkey" FOREIGN KEY ("berkasId") REFERENCES "berkas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_perjanjian" ADD CONSTRAINT "surat_perjanjian_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bimbingan_logs" ADD CONSTRAINT "bimbingan_logs_skripsiId_fkey" FOREIGN KEY ("skripsiId") REFERENCES "skripsi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bimbingan_logs" ADD CONSTRAINT "bimbingan_logs_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bimbingan_logs" ADD CONSTRAINT "bimbingan_logs_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_sidang" ADD CONSTRAINT "jadwal_sidang_skripsiId_fkey" FOREIGN KEY ("skripsiId") REFERENCES "skripsi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_sidang" ADD CONSTRAINT "jadwal_sidang_ruangId_fkey" FOREIGN KEY ("ruangId") REFERENCES "master_ruang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_sidang" ADD CONSTRAINT "jadwal_sidang_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai_sidang" ADD CONSTRAINT "nilai_sidang_skripsiId_fkey" FOREIGN KEY ("skripsiId") REFERENCES "skripsi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai_sidang" ADD CONSTRAINT "nilai_sidang_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisi" ADD CONSTRAINT "revisi_skripsiId_fkey" FOREIGN KEY ("skripsiId") REFERENCES "skripsi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisi" ADD CONSTRAINT "revisi_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisi" ADD CONSTRAINT "revisi_berkasId_fkey" FOREIGN KEY ("berkasId") REFERENCES "berkas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peminjaman_ruang" ADD CONSTRAINT "peminjaman_ruang_skripsiId_fkey" FOREIGN KEY ("skripsiId") REFERENCES "skripsi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peminjaman_ruang" ADD CONSTRAINT "peminjaman_ruang_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peminjaman_ruang" ADD CONSTRAINT "peminjaman_ruang_ruangId_fkey" FOREIGN KEY ("ruangId") REFERENCES "master_ruang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peminjaman_ruang" ADD CONSTRAINT "peminjaman_ruang_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengesahan" ADD CONSTRAINT "pengesahan_skripsiId_fkey" FOREIGN KEY ("skripsiId") REFERENCES "skripsi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengesahan" ADD CONSTRAINT "pengesahan_berkasId_fkey" FOREIGN KEY ("berkasId") REFERENCES "berkas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengesahan" ADD CONSTRAINT "pengesahan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_aktivitas" ADD CONSTRAINT "log_aktivitas_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification" ADD CONSTRAINT "gamification_skripsiId_fkey" FOREIGN KEY ("skripsiId") REFERENCES "skripsi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
