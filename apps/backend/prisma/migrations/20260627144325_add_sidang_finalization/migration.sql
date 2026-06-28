/*
  Warnings:

  - You are about to drop the column `nilaiAngka` on the `nilai_sidang` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[skripsiId,dosenId,komponen]` on the table `nilai_sidang` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BerkasKategori" ADD VALUE 'REVISI_SIDANG';
ALTER TYPE "BerkasKategori" ADD VALUE 'FINAL_SKRIPSI';
ALTER TYPE "BerkasKategori" ADD VALUE 'LEMBAR_PENGESAHAN';

-- AlterEnum
ALTER TYPE "SkripsiStatus" ADD VALUE 'MENUNGGU_PENGESAHAN';

-- DropIndex
DROP INDEX "nilai_sidang_skripsiId_dosenId_key";

-- AlterTable
ALTER TABLE "nilai_sidang" DROP COLUMN "nilaiAngka",
ADD COLUMN     "komponen" TEXT NOT NULL DEFAULT 'sidang',
ADD COLUMN     "nilai" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "revisi" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "deadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "skripsi" ADD COLUMN     "finalApprovedAt" TIMESTAMP(3),
ADD COLUMN     "nilaiAkhir" DOUBLE PRECISION,
ADD COLUMN     "nilaiHuruf" TEXT,
ADD COLUMN     "sidangApprovedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "nilai_sidang_skripsiId_dosenId_komponen_key" ON "nilai_sidang"("skripsiId", "dosenId", "komponen");

-- AddForeignKey
ALTER TABLE "revisi" ADD CONSTRAINT "revisi_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
