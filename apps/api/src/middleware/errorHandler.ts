import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

// Global error handler middleware
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = err instanceof AppError ? err.message : 'Unexpected error occurred';
  const details = err instanceof AppError ? err.details : undefined;

  console.error(`Error rid=${req.id ?? 'n/a'} code=${code}:`, err);

  res.status(status).json({ error: { code, message, details } });
}
