import { Router } from "express";
import {
  getMyNotifications,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from "./notifications.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requirePermission } from "../../middlewares/require-permission.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("notification.read"),
  getMyNotifications
);

router.get(
  "/unread-count",
  authenticate,
  requirePermission("notification.read"),
  getUnreadCount
);

router.patch(
  "/read-all",
  authenticate,
  requirePermission("notification.read"),
  markAllNotificationsAsRead
);

router.patch(
  "/:id/read",
  authenticate,
  requirePermission("notification.read"),
  markNotificationAsRead
);

export default router;
