import { asyncHandler } from "../utils/asyncHandler";
import * as notificationService from "../services/notificationService";

// Gets anomaly notifications
export const getAnomalyNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getAnomalyNotifications(req.user!.organizationId);
  res.json(result);
});

// Marks all anomaly notifications as read
export const markAllAnomaliesRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAnomaliesRead(req.user!.id, req.user!.organizationId);
  res.status(204).end();
});

// Gets overdue submission notifications
export const getOverdueNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getOverdueNotifications(req.user!.organizationId);
  res.json(result);
});
