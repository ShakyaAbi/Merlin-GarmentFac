import { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

// Logs HTTP request details with unique ID
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const id = (req.headers['x-request-id'] as string) || uuid();
  req.id = id;
  res.setHeader('x-request-id', id);
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} rid=${id}`);
  next();
};
