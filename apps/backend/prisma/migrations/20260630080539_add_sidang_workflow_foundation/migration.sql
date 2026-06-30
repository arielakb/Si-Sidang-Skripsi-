-- CreateEnum
CREATE TYPE "SidangJenis" AS ENUM ('SEMINAR_PROPOSAL', 'SEMINAR_HASIL', 'SIDANG_KOMPRE');

-- CreateEnum
CREATE TYPE "SidangStatus" AS ENUM ('DRAFT', 'MENUNGGU_BERKAS', 'MENUNGGU_PENGUJI', 'MENUNGGU_JADWAL', 'DIJADWALKAN', 'BERLANGSUNG', 'MENUNGGU_NILAI', 'MENUNGGU_KEPUTUSAN', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "SidangHasil" AS ENUM ('LOLOS', 'TIDAK_LOLOS', 'REVISI', 'ULANG');

-- CreateEnum
CREATE TYPE "SidangDosenPeran" AS ENUM ('PENGUJI', 'PEMBIMBING', 'KETUA_PENGUJI', 'SEKRETARIS');

-- DropIndex
DROP INDEX "nilai_sidang_skripsiId_dosenId_komponen_key";

-- AlterTable
ALTER TABLE "berkas" ADD COLUMN     "sidangId" TEXT;

-- AlterTable
ALTER TABLE "jadwal_sidang" ADD COLUMN     "sidangId" TEXT;

-- AlterTable
ALTER TABLE "nilai_sidang" ADD COLUMN     "sidangId" TEXT;

-- AlterTable
ALTER TABLE "revisi" ADD COLUMN     "sidangId" TEXT;

-- CreateTable
CREATE TABLE "workflow_stages" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_rules" (
    "id" TEXT NOT NULL,
    "stageCode" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "ruleValue" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sidang" (
    "id" TEXT NOT NULL,
    "skripsiId" TEXT NOT NULL,
    "jenis" "SidangJenis" NOT NULL,
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "status" "SidangStatus" NOT NULL DEFAULT 'DRAFT',
    "hasil" "SidangHasil",
    "catatanHasil" TEXT,
    "createdById" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sidang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sidang_dosen" (
    "id" TEXT NOT NULL,
    "sidangId" TEXT NOT NULL,
    "dosenId" TEXT NOT NULL,
    "peran" "SidangDosenPeran" NOT NULL,
    "assignedById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sidang_dosen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_stages_code_key" ON "workflow_stages"("code");

-- CreateIndex
CREATE INDEX "workflow_rules_stageCode_idx" ON "workflow_rules"("stageCode");

-- CreateIndex
CREATE INDEX "workflow_rules_ruleKey_idx" ON "workflow_rules"("ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_rules_stageCode_ruleKey_key" ON "workflow_rules"("stageCode", "ruleKey");

-- CreateIndex
CREATE INDEX "sidang_skripsiId_idx" ON "sidang"("skripsiId");

-- CreateIndex
CREATE INDEX "sidang_jenis_idx" ON "sidang"("jenis");

-- CreateIndex
CREATE INDEX "sidang_status_idx" ON "sidang"("status");

-- CreateIndex
CREATE INDEX "sidang_hasil_idx" ON "sidang"("hasil");

-- CreateIndex
CREATE UNIQUE INDEX "sidang_skripsiId_jenis_attemptNo_key" ON "sidang"("skripsiId", "jenis", "attemptNo");

-- CreateIndex
CREATE INDEX "sidang_dosen_sidangId_idx" ON "sidang_dosen"("sidangId");

-- CreateIndex
CREATE INDEX "sidang_dosen_dosenId_idx" ON "sidang_dosen"("dosenId");

-- CreateIndex
CREATE INDEX "sidang_dosen_peran_idx" ON "sidang_dosen"("peran");

-- CreateIndex
CREATE UNIQUE INDEX "sidang_dosen_sidangId_dosenId_peran_key" ON "sidang_dosen"("sidangId", "dosenId", "peran");

-- CreateIndex
CREATE INDEX "berkas_sidangId_idx" ON "berkas"("sidangId");

-- CreateIndex
CREATE INDEX "jadwal_sidang_sidangId_idx" ON "jadwal_sidang"("sidangId");

-- CreateIndex
CREATE INDEX "nilai_sidang_skripsiId_dosenId_komponen_idx" ON "nilai_sidang"("skripsiId", "dosenId", "komponen");

-- CreateIndex
CREATE INDEX "nilai_sidang_sidangId_idx" ON "nilai_sidang"("sidangId");

-- CreateIndex
CREATE INDEX "nilai_sidang_sidangId_dosenId_komponen_idx" ON "nilai_sidang"("sidangId", "dosenId", "komponen");

-- CreateIndex
CREATE INDEX "revisi_sidangId_idx" ON "revisi"("sidangId");

-- AddForeignKey
ALTER TABLE "workflow_rules" ADD CONSTRAINT "workflow_rules_stageCode_fkey" FOREIGN KEY ("stageCode") REFERENCES "workflow_stages"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sidang" ADD CONSTRAINT "sidang_skripsiId_fkey" FOREIGN KEY ("skripsiId") REFERENCES "skripsi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sidang" ADD CONSTRAINT "sidang_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sidang" ADD CONSTRAINT "sidang_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sidang_dosen" ADD CONSTRAINT "sidang_dosen_sidangId_fkey" FOREIGN KEY ("sidangId") REFERENCES "sidang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sidang_dosen" ADD CONSTRAINT "sidang_dosen_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sidang_dosen" ADD CONSTRAINT "sidang_dosen_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "berkas" ADD CONSTRAINT "berkas_sidangId_fkey" FOREIGN KEY ("sidangId") REFERENCES "sidang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_sidang" ADD CONSTRAINT "jadwal_sidang_sidangId_fkey" FOREIGN KEY ("sidangId") REFERENCES "sidang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai_sidang" ADD CONSTRAINT "nilai_sidang_sidangId_fkey" FOREIGN KEY ("sidangId") REFERENCES "sidang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisi" ADD CONSTRAINT "revisi_sidangId_fkey" FOREIGN KEY ("sidangId") REFERENCES "sidang"("id") ON DELETE SET NULL ON UPDATE CASCADE;
