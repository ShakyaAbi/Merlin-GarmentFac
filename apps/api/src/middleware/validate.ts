import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { BadRequestError } from '../utils/errors';

type Schemas = {
  body?: ZodSchema<any>;
  params?: ZodSchema<any>;
  query?: ZodSchema<any>;
};

// Validates request body, params and query against schemas
export const validate =
  (schemas: Schemas) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new BadRequestError('VALIDATION_ERROR', 'Invalid request data', err.issues));
      } else {
        next(err);
      }
    }
  };
