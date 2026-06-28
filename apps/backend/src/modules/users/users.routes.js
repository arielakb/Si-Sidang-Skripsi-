import { Router } from "express";
import {
  assignRoles,
  createUser,
  getUsers,
  updateUserStatus
} from "./users.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("user.read"),
  getUsers
);

router.post(
  "/",
  authenticate,
  requirePermission("user.create"),
  createUser
);

router.post(
  "/:id/roles",
  authenticate,
  requirePermission("user.assign_role"),
  assignRoles
);

router.patch(
  "/:id/status",
  authenticate,
  requirePermission("user.update"),
  updateUserStatus
);

export default router;