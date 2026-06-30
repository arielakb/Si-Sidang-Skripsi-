-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SidangHasil" ADD VALUE 'LULUS';
ALTER TYPE "SidangHasil" ADD VALUE 'TIDAK_LULUS';

-- AlterEnum
ALTER TYPE "SidangJenis" ADD VALUE 'SIDANG_AKHIR';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SkripsiStatus" ADD VALUE 'MENUNGGU_SIDANG_AKHIR';
ALTER TYPE "SkripsiStatus" ADD VALUE 'SIDANG_AKHIR';
ALTER TYPE "SkripsiStatus" ADD VALUE 'LULUS_SKRIPSI';
ALTER TYPE "SkripsiStatus" ADD VALUE 'TIDAK_LULUS_SKRIPSI';
