import dotenv from "dotenv";
import fs from "fs/promises";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

async function removePhysicalFile(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Gagal menghapus file fisik:", filePath, error.message);
    }
  }
}

async function syncStatus(skripsiId) {
  const skripsi = await prisma.skripsi.findUnique({
    where: {
      id: skripsiId
    },
    include: {
      berkas: {
        where: {
          kategori: {
            in: ["PROPOSAL", "PRESENTASI"]
          }
        }
      },
      kodeEtik: true
    }
  });

  if (!skripsi) return;

  const hasProposal = skripsi.berkas.some(
    (item) => item.kategori === "PROPOSAL"
  );

  const hasPresentasi = skripsi.berkas.some(
    (item) => item.kategori === "PRESENTASI"
  );

  const hasKodeEtik = skripsi.kodeEtik.length > 0;

  const nextStatus =
    hasProposal && hasPresentasi && hasKodeEtik
      ? "MENUNGGU_APPROVAL"
      : "MENUNGGU_BERKAS";

  if (
    ["MENUNGGU_BERKAS", "MENUNGGU_APPROVAL"].includes(skripsi.status) &&
    skripsi.status !== nextStatus
  ) {
    await prisma.skripsi.update({
      where: {
        id: skripsiId
      },
      data: {
        status: nextStatus
      }
    });
  }
}

async function cleanupKategori(skripsiId, kategori) {
  const files = await prisma.berkas.findMany({
    where: {
      skripsiId,
      kategori
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const [latest, ...duplicates] = files;

  if (!latest) return;

  for (const duplicate of duplicates) {
    await removePhysicalFile(duplicate.path);

    await prisma.berkas.delete({
      where: {
        id: duplicate.id
      }
    });

    console.log(`Deleted duplicate ${kategori}: ${duplicate.id}`);
  }
}

async function main() {
  const skripsiRows = await prisma.skripsi.findMany({
    select: {
      id: true,
      title: true
    }
  });

  for (const skripsi of skripsiRows) {
    await cleanupKategori(skripsi.id, "PROPOSAL");
    await cleanupKategori(skripsi.id, "PRESENTASI");
    await syncStatus(skripsi.id);
  }

  console.log("Cleanup duplicate seminar berkas selesai.");
}

main()
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });