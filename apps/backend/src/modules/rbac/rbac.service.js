import { prisma } from "../../config/prisma.js";

export async function getUserPermissions(userId) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });

  const permissions = new Set();

  for (const userRole of userRoles) {
    for (const rolePermission of userRole.role.rolePermissions) {
      permissions.add(rolePermission.permission.slug);
    }
  }

  return Array.from(permissions);
}

export async function userHasPermission(userId, permissionSlug) {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permissionSlug);
}

export async function getUserRoles(userId) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: true
    }
  });

  return userRoles.map((item) => item.role.slug);
}