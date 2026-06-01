import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { healthCheck } from "../services/mlService";

// Checks ML service health status
export const getMlHealth = asyncHandler(async (_req: Request, res: Response) => {
  const status = await healthCheck();
  res.status(status.reachable ? 200 : 503).json(status);
});
