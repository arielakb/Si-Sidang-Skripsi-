import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

const password = "Password123!";

const demoUsers = [
  {
    identifier: "4519210110",
    name: "Doni Martinus Sihotang",
    email: "doni.demo@sisidang.local",
    roles: ["mahasiswa"]
  },
  {
    identifier: "197701012010011001",
    name: "Dr. Budi Santoso",
    email: "budi.demo@sisidang.local",
    roles: ["dosen_pembimbing"]
  },
  {
    identifier: "198001012005011003",
    name: "Dr. Sari Wulandari",
    email: "sari.demo@sisidang.local",
    roles: ["dosen_penguji"]
  },
  {
    identifier: "197912122008011002",
    name: "Dr. Ahmad Koordinator",
    email: "koordinator.demo@sisidang.local",
    roles: ["dosen_koordinator"]
  },
  {
    identifier: "kaprodi001",
    name: "Ketua Prodi FTI",
    email: "kaprodi.demo@sisidang.local",
    roles: ["ketua_prodi"]
  },
  {
    identifier: "staf001",
    name: "Staf Prodi FTI",
    email: "staf.demo@sisidang.local",
    roles: ["staf_prodi"]
  }
];

async function upsertUserWithRoles(item) {
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS || 10));

  const user = await prisma.user.upsert({
    where: {
      identifier: item.identifier
    },
    update: {
      name: item.name,
      email: item.email,
      passwordHash,
      status: "ACTIVE"
    },
    create: {
      identifier: item.identifier,
      name: item.name,
      email: item.email,
      passwordHash,
      status: "ACTIVE",
      profile: {
        create: {}
      }
    }
  });

  for (const roleSlug of item.roles) {
    const role = await prisma.role.findUniqueOrThrow({
      where: {
        slug: roleSlug
      }
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id
      }
    });
  }

  return user;
}

async function main() {
  console.log("Seeding demo users...");

  for (const item of demoUsers) {
    const user = await upsertUserWithRoles(item);
    console.log(`Demo user ready: ${user.identifier} - ${user.name}`);
  }

  console.log("");
  console.log("Demo password for all demo users:");
  console.log(password);
  console.log("");
  console.log("Demo seed completed.");
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });