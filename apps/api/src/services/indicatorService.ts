import { IndicatorDataType } from "@prisma/client";
import * as indicatorRepo from "../repositories/indicatorRepository";
import * as projectRepo from "../repositories/projectRepository";
import * as logframeRepo from "../repositories/logframeRepository";
import { BadRequestError, NotFoundError } from "../utils/errors";
import {
  validateCategories,
  validateCategoryConfig,
  CategoryDefinition,
  CategoryConfig,
  getCategoryDistribution,
  getMostFrequentCategory,
  getDisaggregatedCategoryDistribution,
  calculateReportingCompliance,
  getCategoryTimeSeries,
} from "./categoricalService";
import { TemplateService } from "./templateService";
import * as submissionService from "./submissionService";
import { normalizeAnomalyConfig } from "./anomalyConfig";
import { prisma } from "../prisma";

const ensureProject = async (projectId: number, organizationId: number) => {
  const project = await projectRepo.getProjectById(projectId, organizationId);
  if (!project)
    throw new NotFoundError("PROJECT_NOT_FOUND", "Project not found");
  return project;
};

const ensureNodeInProject = async (
  logframeNodeId: number,
  projectId: number,
) => {
  const node = await logframeRepo.getById(logframeNodeId);
  if (!node || node.projectId !== projectId) {
    throw new BadRequestError(
      "INVALID_LOGFRAME_NODE",
      "Logframe node must exist within the project",
    );
  }
  return node;
};

// Creates a new indicator for a project
export const createIndicator = async (
  projectId: number,
  organizationId: number,
  data: {
    logframeNodeId: number;
    name: string;
    unit: string;
    baselineValue?: number | null;
    targetValue?: number | null;
    baselineCategory?: string | null;
    targetCategory?: string | null;
    dataType: IndicatorDataType;
    minValue?: number | null;
    maxValue?: number | null;
    anomalyConfig?: Record<string, any> | null;
    reportingFrequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
    categories?: any[] | null;
    categoryConfig?: Record<string, any> | null;
    // Reminder fields
    reminderEnabled?: boolean;
    reminderDaysBeforeDue?: number | null;
    reminderDaysAfterDue?: number | null;
    reminderRecipients?: string[] | null;
  },
  userId: number,
) => {
  await ensureProject(projectId, organizationId);
  await ensureNodeInProject(data.logframeNodeId, projectId);

  // Validate categoryConfig for all indicator types (disaggregation/dimensions support)
  let validatedCategories = null;
  let validatedCategoryConfig = null;

  if (data.categoryConfig) {
    validatedCategoryConfig = validateCategoryConfig(data.categoryConfig);
  }

  if (data.dataType === "CATEGORICAL") {
    if (!data.categories || data.categories.length === 0) {
      throw new BadRequestError(
        "MISSING_CATEGORIES",
        "Categories are required for CATEGORICAL indicators",
      );
    }
    validatedCategories = validateCategories(data.categories);
    // For categorical, if categoryConfig provided then validatedCategoryConfig already set.
    if (!validatedCategoryConfig) {
      validatedCategoryConfig = {};
    }
  }

  const indicator = await indicatorRepo.createIndicator({
    projectId,
    logframeNodeId: data.logframeNodeId,
    name: data.name,
    unit: data.unit,
    baselineValue: data.baselineValue ?? null,
    targetValue: data.targetValue ?? null,
    baselineCategory: data.baselineCategory ?? null,
    targetCategory: data.targetCategory ?? null,
    dataType: data.dataType,
    minValue: data.minValue ?? null,
    maxValue: data.maxValue ?? null,
    anomalyConfig: data.anomalyConfig ?? null,
    validationConfig: {
      reportingFrequency: data.reportingFrequency ?? "WEEKLY",
    },
    categories: validatedCategories as any,
    categoryConfig: validatedCategoryConfig as any,
    createdByUserId: userId,
    // Reminder fields
    reminderEnabled: data.reminderEnabled ?? false,
    reminderDaysBeforeDue: data.reminderDaysBeforeDue ?? null,
    reminderDaysAfterDue: data.reminderDaysAfterDue ?? null,
    reminderRecipients: data.reminderRecipients ?? null,
  });

  // Auto-create default import and export templates
  try {
    const templateService = new TemplateService(prisma);
    await templateService.createDefaultImportTemplate(indicator.id, userId);

  } catch (error) {
    console.error("Failed to create default templates:", error);
    // Don't fail indicator creation if template creation fails
  }

  return indicator;
};


// Lists project indicators
export const getIndicators = async (projectId: number, organizationId: number, includeDeleted = false) => {
  await ensureProject(projectId, organizationId);
  return indicatorRepo.getIndicatorsByProject(projectId, organizationId, includeDeleted);
};


// Fetches one indicator by ID
export const getIndicatorById = async (
  id: number,
  organizationId: number,
  includeSubmissions = false,
  includeDeleted = false,
) => {
  const indicator = includeSubmissions
    ? await indicatorRepo.getByIdWithSubmissions(id, organizationId, includeDeleted)
    : await indicatorRepo.getById(id, organizationId);
  if (!indicator)
    throw new NotFoundError("INDICATOR_NOT_FOUND", "Indicator not found");
  return indicator;
};

// Updates an indicator
export const updateIndicator = async (
  id: number,
  organizationId: number,
  data: Partial<{
    projectId: number;
    logframeNodeId: number;
    name: string;
    unit: string;
    baselineValue: number | null;
    targetValue: number | null;
    dataType: IndicatorDataType;
    minValue: number | null;
    maxValue: number | null;
    anomalyConfig: Record<string, any> | null;
    reportingFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
    categories: any[] | null;
    categoryConfig: Record<string, any> | null;
    // Reminder fields
    reminderEnabled?: boolean;
    reminderDaysBeforeDue?: number | null;
    reminderDaysAfterDue?: number | null;
    reminderRecipients?: string[] | null;
  }>,
) => {
  const indicator = await indicatorRepo.getById(id, organizationId);
  if (!indicator)
    throw new NotFoundError("INDICATOR_NOT_FOUND", "Indicator not found");

  const projectId = data.projectId ?? indicator.projectId;
  await ensureProject(projectId, organizationId);

  if (data.logframeNodeId) {
    await ensureNodeInProject(data.logframeNodeId, projectId);
  }

  // Validate categoryConfig for all types (disaggregation/dimension support)
  let validatedCategories = data.categories;
  let validatedCategoryConfig = data.categoryConfig;

  if (data.categoryConfig !== undefined) {
    validatedCategoryConfig = validateCategoryConfig(data.categoryConfig) as any;
  }

  const finalDataType = data.dataType ?? indicator.dataType;
  if (finalDataType === "CATEGORICAL") {
    if (data.categories !== undefined) {
      if (!data.categories || data.categories.length === 0) {
        throw new BadRequestError(
          "MISSING_CATEGORIES",
          "Categories are required for CATEGORICAL indicators",
        );
      }
      validatedCategories = validateCategories(data.categories) as any;
    }
    if (!validatedCategoryConfig && indicator.categoryConfig) {
      validatedCategoryConfig = validateCategoryConfig(indicator.categoryConfig as any) as any;
    }
  }

  const updatedIndicator = await indicatorRepo.updateIndicator(id, organizationId, {
    projectId,
    logframeNodeId: data.logframeNodeId,
    name: data.name,
    unit: data.unit,
    baselineValue: data.baselineValue,
    targetValue: data.targetValue,
    dataType: data.dataType,
    minValue: data.minValue,
    maxValue: data.maxValue,
    anomalyConfig: data.anomalyConfig,
    validationConfig:
      data.reportingFrequency !== undefined
        ? {
            ...((indicator.validationConfig as any) || {}),
            reportingFrequency: data.reportingFrequency,
          }
        : undefined,
    categories: validatedCategories,
    categoryConfig: validatedCategoryConfig,
    // Reminder fields
    reminderEnabled: data.reminderEnabled,
    reminderDaysBeforeDue: data.reminderDaysBeforeDue,
    reminderDaysAfterDue: data.reminderDaysAfterDue,
    reminderRecipients: data.reminderRecipients,
  });

  const dataTypeChanged =
    data.dataType !== undefined && data.dataType !== indicator.dataType;
  const anomalyConfigChanged =
    data.anomalyConfig !== undefined &&
    JSON.stringify(normalizeAnomalyConfig(data.anomalyConfig ?? null)) !==
      JSON.stringify(
        normalizeAnomalyConfig(indicator.anomalyConfig as any ?? null),
      );

  if (dataTypeChanged || anomalyConfigChanged) {
    await submissionService.recalculateAnomaliesForIndicator(id, organizationId);
  }

  return updatedIndicator;
};

// Recalculates anomaly flags for an indicator
export const recalculateIndicatorAnomalies = async (
  indicatorId: number,
  organizationId: number,
) => {
  const indicator = await getIndicatorById(
    indicatorId,
    organizationId,
    true,
    false,
  );

  await submissionService.recalculateAnomaliesForIndicator(
    indicatorId,
    organizationId,
  );

  return indicator;
};

const calculateTrend = (
  values: number[],
): "increasing" | "decreasing" | "stable" | null => {
  if (values.length < 3) return null;

  let increases = 0;
  let decreases = 0;

  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) increases++;
    else if (values[i] < values[i - 1]) decreases++;
  }

  const total = values.length - 1;
  if (increases / total > 0.6) return "increasing";
  if (decreases / total > 0.6) return "decreasing";
  return "stable";
};

// Builds indicator statistics
export const getIndicatorWithStats = async (id: number, organizationId: number, includeDeleted = false) => {
  const indicator = await indicatorRepo.getByIdWithSubmissions(id, organizationId, includeDeleted);
  if (!indicator)
    throw new NotFoundError("INDICATOR_NOT_FOUND", "Indicator not found");

  const submissions = indicator.submissions || [];

  if (submissions.length === 0) {
    return {
      ...indicator,
      stats: null,
    };
  }

  const anomalyCount = submissions.filter((s) => s.isAnomaly).length;
  const lastSubmission = submissions[0]; // Already sorted desc

  // Handle categorical indicators differently
  if (indicator.dataType === "CATEGORICAL") {
    const categories = indicator.categories as any as CategoryDefinition[];

    if (!categories || categories.length === 0) {
      return {
        ...indicator,
        stats: {
          submissionCount: submissions.length,
          anomalyCount,
          anomalyRate:
            submissions.length > 0
              ? (anomalyCount / submissions.length) * 100
              : 0,
          lastSubmissionDate: lastSubmission.reportedAt,
          categoryDistribution: [],
          mostFrequent: null,
        },
      };
    }

    const distribution = getCategoryDistribution(submissions, categories);
    const mostFrequent = getMostFrequentCategory(submissions, categories);

    return {
      ...indicator,
      stats: {
        submissionCount: submissions.length,
        anomalyCount,
        anomalyRate:
          submissions.length > 0
            ? (anomalyCount / submissions.length) * 100
            : 0,
        lastSubmissionDate: lastSubmission.reportedAt,
        categoryDistribution: distribution,
        mostFrequent,
      },
    };
  }

  // Numeric indicators (NUMBER, PERCENT)
  const numericValues = submissions
    .map((s) => Number(s.value))
    .filter(Number.isFinite);

  const currentValue = numericValues.length > 0 ? numericValues[0] : null;

  const stats = {
    submissionCount: submissions.length,
    anomalyCount,
    anomalyRate:
      submissions.length > 0 ? (anomalyCount / submissions.length) * 100 : 0,
    lastSubmissionDate: lastSubmission.reportedAt,
    currentValue,
    progressToTarget:
      indicator.targetValue && currentValue !== null
        ? (currentValue / Number(indicator.targetValue)) * 100
        : null,
    progressFromBaseline:
      indicator.baselineValue && currentValue !== null
        ? currentValue - Number(indicator.baselineValue)
        : null,
    average:
      numericValues.length > 0
        ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
        : null,
    min: numericValues.length > 0 ? Math.min(...numericValues) : null,
    max: numericValues.length > 0 ? Math.max(...numericValues) : null,
    trend: calculateTrend(numericValues.reverse()), // Reverse to chronological order
  };

  return {
    ...indicator,
    stats,
  };
};

// Detects reporting gaps for an indicator
export const detectReportingGaps = (
  submissions: { reportedAt: Date }[],
  expectedFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY",
) => {
  if (submissions.length < 2) return [];

  const sorted = [...submissions].sort(
    (a, b) => a.reportedAt.getTime() - b.reportedAt.getTime(),
  );

  const gaps: Array<{
    from: Date;
    to: Date;
    daysMissing: number;
    expectedSubmissions: number;
  }> = [];

  const expectedDays = {
    DAILY: 1,
    WEEKLY: 7,
    MONTHLY: 30,
    QUARTERLY: 90,
    YEARLY: 365,
  }[expectedFrequency];

  for (let i = 1; i < sorted.length; i++) {
    const daysDiff =
      (sorted[i].reportedAt.getTime() - sorted[i - 1].reportedAt.getTime()) /
      (1000 * 60 * 60 * 24);
    const threshold = expectedDays * 1.5; // Allow 50% tolerance

    if (daysDiff > threshold) {
      gaps.push({
        from: sorted[i - 1].reportedAt,
        to: sorted[i].reportedAt,
        daysMissing: Math.floor(daysDiff - expectedDays),
        expectedSubmissions: Math.floor(daysDiff / expectedDays) - 1,
      });
    }
  }

  return gaps;
};

// Bulk updates indicators
export const bulkUpdateIndicators = async (
  projectId: number,
  organizationId: number,
  updates: Array<{
    id: number;
    data: Partial<{
      logframeNodeId: number;
      name: string;
      unit: string;
      baselineValue: number | null;
      targetValue: number | null;
      dataType: IndicatorDataType;
      minValue: number | null;
      maxValue: number | null;
      anomalyConfig: Record<string, any> | null;
    }>;
  }>,
) => {
  await ensureProject(projectId, organizationId);

  // Validate all indicators belong to the project
  const indicators = await Promise.all(
    updates.map((u) => indicatorRepo.getById(u.id, organizationId)),
  );

  if (indicators.some((ind) => !ind || ind.projectId !== projectId)) {
    throw new BadRequestError(
      "INVALID_INDICATOR",
      "All indicators must belong to the specified project",
    );
  }

  // Validate logframe nodes if provided
  for (const update of updates) {
    if (update.data.logframeNodeId) {
      await ensureNodeInProject(update.data.logframeNodeId, projectId);
    }
  }

  const { prisma } = await import("../prisma");

  return prisma.$transaction(
    updates.map(({ id, data }) => indicatorRepo.updateIndicator(id, organizationId, data)),
  );
};

// Soft-deletes an indicator
export const deleteIndicator = async (id: number, organizationId: number) => {
  const indicator = await indicatorRepo.getById(id, organizationId);

  if (!indicator) {
    throw new NotFoundError("INDICATOR_NOT_FOUND", "Indicator not found");
  }

  return indicatorRepo.deleteIndicator(id, organizationId);
};

// Gets indicator templates
export const getIndicatorTemplates = async (indicatorId: number, organizationId: number) => {
  const indicator = await indicatorRepo.getById(indicatorId, organizationId);

  if (!indicator) {
    throw new NotFoundError("INDICATOR_NOT_FOUND", "Indicator not found");
  }

  const importTemplates = await prisma.importTemplate.findMany({
    where: { indicatorId },
    orderBy: { createdAt: "desc" },
  });

  const exportTemplates = await prisma.exportTemplate.findMany({
    where: { indicatorId },
    orderBy: { createdAt: "desc" },
  });

  return {
    importTemplates,
    exportTemplates,
  };
};

// Gets disaggregated category stats
export const getDisaggregatedCategoryStats = async (indicatorId: number, organizationId: number, includeDeleted = false) => {
  const indicator = await indicatorRepo.getByIdWithSubmissions(indicatorId, organizationId, includeDeleted);

  if (!indicator) {
    throw new NotFoundError("INDICATOR_NOT_FOUND", "Indicator not found");
  }

  if (indicator.dataType !== "CATEGORICAL") {
    throw new BadRequestError(
      "NOT_CATEGORICAL",
      "This endpoint only works with CATEGORICAL indicators",
    );
  }

  const submissions = indicator.submissions || [];
  const categories = indicator.categories as any as CategoryDefinition[];
  const categoryConfig =
    indicator.categoryConfig as any as CategoryConfig | null;

  if (!categories || categories.length === 0) {
    return {
      indicator: {
        id: indicator.id,
        name: indicator.name,
        categories: [],
      },
      disaggregatedStats: [],
      totalSubmissions: 0,
    };
  }

  const disaggregatedStats = getDisaggregatedCategoryDistribution(
    submissions,
    categories,
    categoryConfig,
  );

  return {
    indicator: {
      id: indicator.id,
      name: indicator.name,
      categories,
      categoryConfig,
    },
    disaggregatedStats,
    totalSubmissions: submissions.length,
  };
};

// Calculates reporting compliance
export const getReportingCompliance = async (
  indicatorId: number,
  organizationId: number,
  startDate: Date,
  endDate: Date,
  reportingFrequency:
    | "DAILY"
    | "WEEKLY"
    | "MONTHLY"
    | "QUARTERLY"
    | "YEARLY" = "MONTHLY",
) => {
  const indicator = await indicatorRepo.getById(indicatorId, organizationId);
  if (!indicator) {
    throw new NotFoundError("INDICATOR_NOT_FOUND", "Indicator not found");
  }

  if (indicator.dataType !== "CATEGORICAL") {
    throw new BadRequestError(
      "INVALID_DATA_TYPE",
      "Reporting compliance is only available for categorical indicators",
    );
  }

  const categoryConfig: CategoryConfig | null = indicator.categoryConfig
    ? (indicator.categoryConfig as unknown as CategoryConfig)
    : null;

  // Get all submissions for the indicator
  let submissions = await prisma.submission.findMany({
    where: {
      indicatorId,
      reportedAt: { gte: startDate, lte: endDate },
      deletedAt: null,
    },
    orderBy: { reportedAt: "asc" },
  });


  return calculateReportingCompliance(
    submissions,
    categoryConfig,
    startDate,
    endDate,
    reportingFrequency,
  );
};

// Builds category time-series stats
export const getCategoryTimeSeriesStats = async (
  indicatorId: number,
  organizationId: number,
  startDate: Date,
  endDate: Date,
  groupBy: "day" | "week" | "month" | "quarter" | "year" = "month",
) => {
  const indicator = await indicatorRepo.getById(indicatorId, organizationId);
  if (!indicator) {
    throw new NotFoundError("INDICATOR_NOT_FOUND", "Indicator not found");
  }

  if (indicator.dataType !== "CATEGORICAL") {
    throw new BadRequestError(
      "INVALID_DATA_TYPE",
      "Time-series stats are only available for categorical indicators",
    );
  }

  const categories: CategoryDefinition[] = indicator.categories
    ? (indicator.categories as unknown as CategoryDefinition[])
    : [];

  // Get all submissions for the indicator
  let submissions = await prisma.submission.findMany({
    where: {
      indicatorId,
      reportedAt: { gte: startDate, lte: endDate },
      deletedAt: null,
    },
    orderBy: { reportedAt: "asc" },
  });


  return getCategoryTimeSeries(
    submissions,
    categories,
    startDate,
    endDate,
    groupBy,
  );
};

// Evaluates ML anomaly models
export const evaluateML = async (
  indicatorId: number,
  organizationId: number,
  compareAll = false,
) => {
  const indicator = await indicatorRepo.getByIdWithSubmissions(indicatorId, organizationId);
  if (!indicator) {
    throw new NotFoundError("INDICATOR_NOT_FOUND", "Indicator not found");
  }

  const submissions = indicator.submissions || [];
  if (submissions.length < 5) {
    throw new BadRequestError(
      "INSUFFICIENT_DATA",
      "At least 5 submissions are required for evaluation",
    );
  }

  // Get values and labels (isAnomaly)
  const numericSubmissions = submissions
    .map((s) => ({ value: Number(s.value), isAnomaly: s.isAnomaly }))
    .filter((s) => Number.isFinite(s.value));
  
  const values = numericSubmissions.map((s) => s.value);
  const labels = numericSubmissions.map((s) => s.isAnomaly);

  const anomalyConfig = (indicator.anomalyConfig as any) || {};
  const mlConfig = anomalyConfig.ml || {};

  const { evaluateModels } = await import("./mlService");

  return evaluateModels({
    indicatorId: indicator.id,
    dataType: indicator.dataType,
    values,
    labels,
    config: {
      method: mlConfig.method || "ISOLATION_FOREST",
      contamination: mlConfig.contamination || 0.05,
      windowSize: mlConfig.windowSize || 50,
      minPoints: mlConfig.minPoints || 10,
      seed: mlConfig.seed || 42,
    },
    compareAll,
  });
};

// Lists available ML algorithms
export const getMLAlgorithms = async () => {
  const { getAlgorithms } = await import("./mlService");
  return getAlgorithms();
};
