import { z } from 'zod';
import { NodeType } from '@prisma/client';

const numericId = z.union([
  z.string().regex(/^\d+$/).transform((v) => Number(v)),
  z.number().int()
]);


// Validates project ID param for logframe routes
export const projectLogframeParamsSchema = {
  params: z.object({
    projectId: numericId
  })
};

// Validates logframe node creation request body
export const createLogframeNodeSchema = {
  body: z.object({
    type: z.nativeEnum(NodeType),
    title: z.string().min(1),
    description: z.string().optional(),
    assumptions: z.string().optional(),
    risks: z.string().optional(),
    parentId: numericId.nullable().optional(),
    sortOrder: z.number().int().optional()
  })
};

// Validates logframe node ID URL parameter
export const logframeNodeIdParamsSchema = {
  params: z.object({
    id: numericId
  })
};

// Validates logframe node update request body and params
export const updateLogframeNodeSchema = {
  ...logframeNodeIdParamsSchema,
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    assumptions: z.string().optional(),
    risks: z.string().optional(),
    parentId: numericId.nullable().optional(),
    sortOrder: z.number().int().optional(),
    type: z.nativeEnum(NodeType).optional()
  })
};
