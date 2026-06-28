import { userHasPermission } from "../modules/rbac/rbac.service.js";

export function requirePermission(permissionSlug) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }

      const allowed = await userHasPermission(req.user.id, permissionSlug);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Forbidden"
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}