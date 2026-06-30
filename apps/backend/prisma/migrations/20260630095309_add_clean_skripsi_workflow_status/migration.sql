-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SkripsiStatus" ADD VALUE 'MENUNGGU_PEMBIMBING';
ALTER TYPE "SkripsiStatus" ADD VALUE 'BIMBINGAN';
ALTER TYPE "SkripsiStatus" ADD VALUE 'MENUNGGU_SEMINAR_HASIL';
ALTER TYPE "SkripsiStatus" ADD VALUE 'SEMINAR_HASIL';
ALTER TYPE "SkripsiStatus" ADD VALUE 'MENUNGGU_KOMPRE';
ALTER TYPE "SkripsiStatus" ADD VALUE 'SIDANG_KOMPRE';
