import { Role } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../utils/errors';

// Middleware that requires specific user roles
export const requireRoles =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    return next();
  };
