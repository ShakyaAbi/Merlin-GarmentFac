import { z } from "zod";
import { IndicatorDataType } from "@prisma/client";

const numericId = z
  .string()
  .regex(/^\d+$/)
  .transform((v) => Number(v));

const anomalyConfigSchema = z
   .object({
     enabled: z.boolean().default(true),
     mode: z.enum(["RULES", "ML"]).default("RULES"),
     rules: z
       .object({
         range: z.boolean().default(true),
         maxChangePercent: z.number().positive().default(50),
       })
       .optional(),
     outlier: z
       .object({
         method: z.enum(["MAD", "IQR"]).default("MAD"),
         threshold: z.number().positive().default(3.5),
         windowSize: z.number().int().min(2).max(50).default(8),
         minPoints: z.number().int().min(2).default(6),
       })
       .optional(),
     trend: z
       .object({
         method: z.enum(["SLOPE_SHIFT", "MEAN_SHIFT"]).default("SLOPE_SHIFT"),
         threshold: z.number().positive().default(2),
         windowSize: z.number().int().min(3).max(50).default(6),
       })
       .optional(),
     ml: z
       .object({
         method: z
           .enum(["ISOLATION_FOREST", "Z_SCORE", "LOF", "DBSCAN"])
           .default("ISOLATION_FOREST"),
         contamination: z.number().min(0.001).max(0.5).default(0.05).optional(),
         windowSize: z.number().int().min(5).max(500).default(50).optional(),
         minPoints: z.number().int().min(5).max(500).default(20).optional(),
         seed: z.number().int().optional(),
         zscore_threshold: z.number().positive().default(3.5).optional(),
       })
       .optional(),
     fallback: z
       .object({
         useRangeChecks: z.boolean().default(true),
         useRulesWhenInsufficientData: z.boolean().default(true),
         useRulesOnServiceError: z.boolean().default(true),
       })
       .optional(),
   })
   .optional()
   .nullable();

const categoryDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: z.string().optional(),
  description: z.string().optional(),
});

const disaggregationDimensionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  values: z.array(z.string()).min(1),
  required: z.boolean().optional(),
});

const categoryConfigSchema = z
  .object({
    allowMultiple: z.boolean().optional(),
    maxSelections: z.number().int().positive().optional(),
    required: z.boolean().optional(),
    allowOther: z.boolean().optional(),
    disaggregationDimensions: z
      .array(disaggregationDimensionSchema)
      .optional(),
    expectedReportingEntities: z.number().int().nonnegative().optional(),
  })
  .optional()
  .nullable();

const reportingFrequencySchema = z
  .enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"])
  .optional();

// Validates project ID param for indicator routes
export const projectIndicatorParamsSchema = {
  params: z.object({
    projectId: numericId,
  }),
};

// Validates indicator ID URL parameter
export const indicatorIdParamsSchema = {
  params: z.object({
    id: numericId,
  }),
};

// Validates indicator creation request body
export const createIndicatorSchema = {
  body: z.object({
    logframeNodeId: z.number().int(),
    name: z.string().min(1),
    unit: z.string().min(1),
    baselineValue: z.number().optional().nullable(),
    targetValue: z.number().optional().nullable(),
    baselineCategory: z.string().optional().nullable(),
    targetCategory: z.string().optional().nullable(),
    dataType: z.nativeEnum(IndicatorDataType),
    minValue: z.number().optional().nullable(),
    maxValue: z.number().optional().nullable(),
    anomalyConfig: anomalyConfigSchema,
    reportingFrequency: reportingFrequencySchema,
    categories: z.array(categoryDefinitionSchema).optional().nullable(),
    categoryConfig: categoryConfigSchema,
    // Reminder fields
    reminderEnabled: z.boolean().optional(),
    reminderDaysBeforeDue: z.number().int().optional().nullable(),
    reminderDaysAfterDue: z.number().int().optional().nullable(),
    reminderRecipients: z.array(z.string()).optional().nullable(),
  }),
};

// Validates indicator update request body and params
export const updateIndicatorSchema = {
  ...indicatorIdParamsSchema,
  body: z.object({
    projectId: z.number().int().optional(),
    logframeNodeId: z.number().int().optional(),
    name: z.string().min(1).optional(),
    unit: z.string().min(1).optional(),
    baselineValue: z.number().optional().nullable(),
    targetValue: z.number().optional().nullable(),
    baselineCategory: z.string().optional().nullable(),
    targetCategory: z.string().optional().nullable(),
    dataType: z.nativeEnum(IndicatorDataType).optional(),
    minValue: z.number().optional().nullable(),
    maxValue: z.number().optional().nullable(),
    anomalyConfig: anomalyConfigSchema,
    reportingFrequency: reportingFrequencySchema,
    categories: z.array(categoryDefinitionSchema).optional().nullable(),
    categoryConfig: categoryConfigSchema,
    // Reminder fields
    reminderEnabled: z.boolean().optional(),
    reminderDaysBeforeDue: z.number().int().optional().nullable(),
    reminderDaysAfterDue: z.number().int().optional().nullable(),
    reminderRecipients: z.array(z.string()).optional().nullable(),
  }),
};
