import { z } from "zod";
import { AnomalyStatus } from "@prisma/client";

const numericId = z
  .string()
  .regex(/^\d+$/)
  .transform((v) => Number(v));

const dateString = z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
  message: "Invalid date format",
});

// Validates indicator ID param for submissions
export const indicatorSubmissionsParamsSchema = {
  params: z.object({
    indicatorId: numericId,
  }),
};

// Validates submission creation request body
export const createSubmissionSchema = {
  body: z.object({
    reportedAt: dateString,
    value: z.union([z.string(), z.number(), z.boolean()]),
    categoryValue: z.string().optional().nullable(),
    disaggregationKey: z.string().optional().nullable(),
    evidence: z.string().optional().nullable(),
  }),
};

// Validates submission update request body and params
export const updateSubmissionSchema = {
  params: z.object({
    id: numericId,
  }),
  body: z.object({
    reportedAt: dateString,
    value: z.union([z.string(), z.number(), z.boolean()]),
    categoryValue: z.string().optional().nullable(),
    disaggregationKey: z.string().optional().nullable(),
    evidence: z.string().optional().nullable(),
  }),
};

// Validates query params for listing submissions
export const listSubmissionsQuerySchema = {
  query: z.object({
    from: dateString.optional(),
    to: dateString.optional(),
    includeDeleted: z
      .union([z.literal("true"), z.literal("false")])
      .optional(),
  }),
};

// Validates submission ID URL parameter
export const submissionIdParamsSchema = {
  params: z.object({
    id: numericId,
  }),
};

// Validates anomaly acknowledgment request body
export const acknowledgeAnomalySchema = {
  ...submissionIdParamsSchema,
  body: z.object({
    notes: z.string().optional(),
  }),
};

// Validates anomaly status update request body
export const updateAnomalyStatusSchema = {
  ...submissionIdParamsSchema,
  body: z.object({
    status: z.nativeEnum(AnomalyStatus),
    notes: z.string().optional(),
  }),
};

// Validates submission restore request params
export const restoreSubmissionSchema = {
  ...submissionIdParamsSchema,
};
