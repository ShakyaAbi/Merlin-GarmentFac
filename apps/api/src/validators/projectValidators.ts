import { z } from 'zod';
import { ProjectStatus } from '@prisma/client';

const dateString = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), { message: 'Invalid date format' });

// Validates project creation request body
export const createProjectSchema = {
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    status: z.nativeEnum(ProjectStatus).optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    sectors: z.array(z.string()).optional(),
    location: z.string().optional(),
    donor: z.string().optional(),
    budgetAmount: z.number().optional(),
    budgetSpent: z.number().optional(),
    budgetCurrency: z.string().optional()
  })
};

// Validates project ID URL parameter
export const projectIdParamSchema = {
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/)
      .transform((v) => Number(v))
  })
};

// Validates project update request body and params
export const updateProjectSchema = {
  ...projectIdParamSchema,
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.nativeEnum(ProjectStatus).optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    sectors: z.array(z.string()).optional(),
    location: z.string().optional(),
    donor: z.string().optional(),
    budgetAmount: z.number().optional(),
    budgetSpent: z.number().optional(),
    budgetCurrency: z.string().optional()
  })
};
