import { IndicatorDataType } from "@prisma/client";
import { prisma } from "../prisma";

// Creates a new indicator with all fields
export const createIndicator = (data: {
  projectId: number;
  logframeNodeId: number;
  name: string;
  unit: string;
  baselineValue: number | null;
  targetValue: number | null;
  baselineCategory?: string | null;
  targetCategory?: string | null;
  dataType: IndicatorDataType;
  minValue: number | null;
  maxValue: number | null;
  anomalyConfig?: Record<string, any> | null;
  categories?: any[] | null;
  categoryConfig?: Record<string, any> | null;
  validationConfig?: Record<string, any> | null;
  createdByUserId: number;
  // Reminder fields
  reminderEnabled?: boolean;
  reminderDaysBeforeDue?: number | null;
  reminderDaysAfterDue?: number | null;
  reminderRecipients?: string[] | null;
}) =>
  prisma.indicator.create({
    data: {
      ...data,
      anomalyConfig: data.anomalyConfig as any,
      categories: data.categories as any,
      categoryConfig: data.categoryConfig as any,
      validationConfig: data.validationConfig as any,
      reminderEnabled: data.reminderEnabled ?? false,
      reminderDaysBeforeDue: data.reminderDaysBeforeDue ?? null,
      reminderDaysAfterDue: data.reminderDaysAfterDue ?? null,
      reminderRecipients: data.reminderRecipients ? (data.reminderRecipients as any) : null,
    },
  });


// Gets all indicators for a project
export const getIndicatorsByProject = (projectId: number, organizationId: number, includeDeleted = false) =>
  prisma.indicator.findMany({
    where: { 
      projectId,
      project: { organizationId }
    },
    include: {
      submissions: {
        where: includeDeleted ? {} : { deletedAt: null },
        orderBy: { reportedAt: 'desc' },
        take: 50
      }
    },
    orderBy: { createdAt: "desc" },
  });

// Gets an indicator by ID within an organization
export const getById = (id: number, organizationId: number) =>
  prisma.indicator.findFirst({ where: { id, project: { organizationId } } });


// Gets an indicator with its submissions
export const getByIdWithSubmissions = (id: number, organizationId: number, includeDeleted = false) =>
  prisma.indicator.findFirst({
    where: { id, project: { organizationId } },
    include: {
      submissions: {
        where: includeDeleted ? {} : { deletedAt: null },
        orderBy: { reportedAt: "desc" },
      },
    },
  });

// Updates an indicator's fields
export const updateIndicator = (
  id: number,
  organizationId: number,
  data: Partial<{
    projectId: number;
    logframeNodeId: number;
    name: string;
    unit: string;
    baselineValue: number | null;
    targetValue: number | null;
    baselineCategory: string | null;
    targetCategory: string | null;
    dataType: IndicatorDataType;
    minValue: number | null;
    maxValue: number | null;
    anomalyConfig: Record<string, any> | null;
    categories: any[] | null;
    categoryConfig: Record<string, any> | null;
    validationConfig: Record<string, any> | null;
    // Reminder fields
    reminderEnabled?: boolean;
    reminderDaysBeforeDue?: number | null;
    reminderDaysAfterDue?: number | null;
    reminderRecipients?: string[] | null;
  }>,
) =>
  prisma.indicator.update({
    where: { id },
    data: {
      ...data,
      anomalyConfig:
        data.anomalyConfig !== undefined
          ? (data.anomalyConfig as any)
          : undefined,
      categories:
        data.categories !== undefined ? (data.categories as any) : undefined,
      categoryConfig:
        data.categoryConfig !== undefined
          ? (data.categoryConfig as any)
          : undefined,
      validationConfig:
        data.validationConfig !== undefined
          ? (data.validationConfig as any)
          : undefined,
      reminderEnabled: data.reminderEnabled,
      reminderDaysBeforeDue: data.reminderDaysBeforeDue,
      reminderDaysAfterDue: data.reminderDaysAfterDue,
      reminderRecipients: data.reminderRecipients ? (data.reminderRecipients as any) : undefined,
    },
  });

// Deletes an indicator by ID
export const deleteIndicator = (id: number, organizationId: number) =>
  prisma.indicator.delete({ where: { id, project: { organizationId } } });
