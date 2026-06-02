import { BadRequestError } from "../utils/errors";

export interface CategoryDefinition {
  id: string;
  label: string;
  color?: string;
  description?: string;
}

export interface DisaggregationDimension {
  key: string; // e.g., "district", "gender", "age_group"
  label: string; // e.g., "District", "Gender", "Age Group"
  values: string[]; // e.g., ["District1", "District2", ...]
  required: boolean;
}

export interface CategoryConfig {
  allowMultiple?: boolean;
  maxSelections?: number;
  required?: boolean;
  allowOther?: boolean;
  disaggregationDimensions?: DisaggregationDimension[];
  reportingFrequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  expectedReportingEntities?: number;
}

// Validates category definitions
/**
 * Validates category definitions
 */
export const validateCategories = (categories: any): CategoryDefinition[] => {
  if (!Array.isArray(categories)) {
    throw new BadRequestError(
      "INVALID_CATEGORIES",
      "Categories must be an array",
    );
  }

  if (categories.length === 0) {
    throw new BadRequestError(
      "EMPTY_CATEGORIES",
      "At least one category is required",
    );
  }

  const seenIds = new Set<string>();

  const validated = categories.map((cat, index) => {
    if (!cat || typeof cat !== "object") {
      throw new BadRequestError(
        "INVALID_CATEGORY",
        `Category at index ${index} must be an object`,
      );
    }

    if (!cat.id || typeof cat.id !== "string") {
      throw new BadRequestError(
        "INVALID_CATEGORY_ID",
        `Category at index ${index} must have a valid id`,
      );
    }

    if (!cat.label || typeof cat.label !== "string") {
      throw new BadRequestError(
        "INVALID_CATEGORY_LABEL",
        `Category at index ${index} must have a valid label`,
      );
    }

    if (seenIds.has(cat.id)) {
      throw new BadRequestError(
        "DUPLICATE_CATEGORY_ID",
        `Category ID '${cat.id}' is duplicated`,
      );
    }

    seenIds.add(cat.id);

    return {
      id: cat.id,
      label: cat.label,
      color: cat.color || undefined,
      description: cat.description || undefined,
    };
  });

  return validated;
};

// Validates disaggregation dimensions
/**
 * Validates disaggregation dimensions
 */
export const validateDisaggregationDimensions = (
  dimensions: any,
): DisaggregationDimension[] => {
  if (!Array.isArray(dimensions)) {
    throw new BadRequestError(
      "INVALID_DISAGGREGATION",
      "Disaggregation dimensions must be an array",
    );
  }

  const seenKeys = new Set<string>();

  return dimensions.map((dim, index) => {
    if (!dim || typeof dim !== "object") {
      throw new BadRequestError(
        "INVALID_DIMENSION",
        `Dimension at index ${index} must be an object`,
      );
    }

    const key =
      typeof dim.key === "string"
        ? dim.key
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
        : "";
    const label = typeof dim.label === "string" ? dim.label.trim() : "";
    const values = Array.isArray(dim.values)
      ? dim.values
          .map((v: any) => String(v).trim())
          .filter((v: string) => v.length > 0)
      : [];

    if (!key) {
      throw new BadRequestError(
        "INVALID_DIMENSION_KEY",
        `Dimension at index ${index} must have a valid key`,
      );
    }

    if (!label) {
      throw new BadRequestError(
        "INVALID_DIMENSION_LABEL",
        `Dimension at index ${index} must have a valid label`,
      );
    }

    if (seenKeys.has(key)) {
      throw new BadRequestError(
        "DUPLICATE_DIMENSION_KEY",
        `Disaggregation key '${key}' is duplicated`,
      );
    }
    seenKeys.add(key);

    if (values.length === 0) {
      throw new BadRequestError(
        "INVALID_DIMENSION_VALUES",
        `Dimension at index ${index} must have at least one value`,
      );
    }

    if (dim.required !== undefined && typeof dim.required !== "boolean") {
      throw new BadRequestError(
        "INVALID_DIMENSION_REQUIRED",
        `Dimension at index ${index} must specify if it's required`,
      );
    }

    const uniqueValues = Array.from(new Set<string>(values));

    return {
      key,
      label,
      values: uniqueValues,
      required: typeof dim.required === "boolean" ? dim.required : false,
    };
  });
};

// Validates category configuration
/**
 * Validates category configuration
 */
export const validateCategoryConfig = (config: any): CategoryConfig => {
  if (!config || typeof config !== "object") {
    throw new BadRequestError(
      "INVALID_CATEGORY_CONFIG",
      "Category config must be an object",
    );
  }

  const validated: CategoryConfig = {};

  if (config.allowMultiple !== undefined) {
    if (typeof config.allowMultiple !== "boolean") {
      throw new BadRequestError(
        "INVALID_ALLOW_MULTIPLE",
        "allowMultiple must be a boolean",
      );
    }
    validated.allowMultiple = config.allowMultiple;
  }

  if (config.maxSelections !== undefined) {
    if (typeof config.maxSelections !== "number" || config.maxSelections < 1) {
      throw new BadRequestError(
        "INVALID_MAX_SELECTIONS",
        "maxSelections must be a positive number",
      );
    }
    validated.maxSelections = config.maxSelections;
  }

  if (config.required !== undefined) {
    if (typeof config.required !== "boolean") {
      throw new BadRequestError(
        "INVALID_REQUIRED",
        "required must be a boolean",
      );
    }
    validated.required = config.required;
  }

  if (config.allowOther !== undefined) {
    if (typeof config.allowOther !== "boolean") {
      throw new BadRequestError(
        "INVALID_ALLOW_OTHER",
        "allowOther must be a boolean",
      );
    }
    validated.allowOther = config.allowOther;
  }

  if (config.disaggregationDimensions !== undefined) {
    validated.disaggregationDimensions = validateDisaggregationDimensions(
      config.disaggregationDimensions,
    );
  }

  if (config.reportingFrequency !== undefined) {
    const validFrequencies = [
      "DAILY",
      "WEEKLY",
      "MONTHLY",
      "QUARTERLY",
      "YEARLY",
    ];
    if (!validFrequencies.includes(config.reportingFrequency)) {
      throw new BadRequestError(
        "INVALID_REPORTING_FREQUENCY",
        `reportingFrequency must be one of: ${validFrequencies.join(", ")}`,
      );
    }
    validated.reportingFrequency = config.reportingFrequency;
  }

  if (config.expectedReportingEntities !== undefined) {
    if (
      typeof config.expectedReportingEntities !== "number" ||
      config.expectedReportingEntities <= 0
    ) {
      throw new BadRequestError(
        "INVALID_EXPECTED_ENTITIES",
        "expectedReportingEntities must be a positive number",
      );
    }
    validated.expectedReportingEntities = config.expectedReportingEntities;
  }

  return validated;
};

// Validates a categorical submission value
/**
 * Validates a categorical submission value
 */
export const validateCategoricalValue = (
  value: string,
  categories: CategoryDefinition[],
  config: CategoryConfig,
): string[] => {
  const categoryIds = new Set(categories.map((c) => c.id));

  // Parse the value (can be single or comma-separated)
  const selectedIds = value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  if (selectedIds.length === 0) {
    // Category selection is optional unless explicitly required
    if (config.required === true) {
      throw new BadRequestError(
        "REQUIRED_CATEGORY",
        "Category selection is required",
      );
    }
    return [];
  }

  // Check if multiple selections are allowed
  if (!config.allowMultiple && selectedIds.length > 1) {
    throw new BadRequestError(
      "MULTIPLE_NOT_ALLOWED",
      "Multiple category selections are not allowed",
    );
  }

  // Check max selections
  if (config.maxSelections && selectedIds.length > config.maxSelections) {
    throw new BadRequestError(
      "MAX_SELECTIONS_EXCEEDED",
      `Maximum ${config.maxSelections} selections allowed`,
    );
  }

  // Validate each selected ID
  for (const id of selectedIds) {
    if (id === "other" && config.allowOther) {
      continue; // Allow "other" option
    }

    if (!categoryIds.has(id)) {
      throw new BadRequestError(
        "INVALID_CATEGORY_VALUE",
        `Invalid category ID: ${id}`,
      );
    }
  }

  return selectedIds;
};

// Formats categorical value for storage
/**
 * Format categorical value for storage (comma-separated string)
 */
export const formatCategoricalValue = (selectedIds: string[]): string => {
  return selectedIds.join(",");
};

// Parses categorical value from storage
/**
 * Parse categorical value from storage
 */
export const parseCategoricalValue = (value: string): string[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
};

/**
 * Calculate distribution statistics for categorical data
 */
export interface CategoryStats {
  categoryId: string;
  label: string;
  count: number;
  percentage: number;
}

// Calculates distribution stats for categorical data
export const getCategoryDistribution = (
  submissions: Array<{ value?: string | null; categoryValue?: string | null }>,
  categories: CategoryDefinition[],
): CategoryStats[] => {
  const counts = new Map<string, number>();

  // Initialize counts
  categories.forEach((cat) => counts.set(cat.id, 0));

  // Count occurrences
  let totalSelections = 0;
  submissions.forEach((sub) => {
    const rawValue = sub.categoryValue ?? sub.value ?? "";
    if (typeof rawValue !== "string") return;
    const selectedIds = parseCategoricalValue(rawValue);
    selectedIds.forEach((id) => {
      if (counts.has(id)) {
        counts.set(id, counts.get(id)! + 1);
        totalSelections++;
      }
    });
  });

  // Calculate percentages
  const stats: CategoryStats[] = categories.map((cat) => ({
    categoryId: cat.id,
    label: cat.label,
    count: counts.get(cat.id) || 0,
    percentage:
      totalSelections > 0
        ? ((counts.get(cat.id) || 0) / totalSelections) * 100
        : 0,
  }));

  return stats.sort((a, b) => b.count - a.count);
};

// Gets the most frequently selected category
/**
 * Get the most frequently selected category
 */
export const getMostFrequentCategory = (
  submissions: Array<{ value?: string | null; categoryValue?: string | null }>,
  categories: CategoryDefinition[],
): { categoryId: string; label: string; count: number } | null => {
  const distribution = getCategoryDistribution(submissions, categories);
  if (distribution.length === 0 || distribution[0].count === 0) return null;

  return {
    categoryId: distribution[0].categoryId,
    label: distribution[0].label,
    count: distribution[0].count,
  };
};

// Calculates trend for categorical data over time
/**
 * Calculate trend for categorical data (most common category over time)
 */
export const getCategoryTrend = (
  submissions: Array<{
    value?: string | null;
    categoryValue?: string | null;
    reportedAt: Date;
  }>,
  categories: CategoryDefinition[],
  timeWindowDays: number = 30,
): { current: string | null; previous: string | null; isChanging: boolean } => {
  if (submissions.length === 0) {
    return { current: null, previous: null, isChanging: false };
  }

  const now = new Date();
  const cutoffDate = new Date(
    now.getTime() - timeWindowDays * 24 * 60 * 60 * 1000,
  );

  const recentSubmissions = submissions.filter(
    (s) => s.reportedAt >= cutoffDate,
  );
  const olderSubmissions = submissions.filter((s) => s.reportedAt < cutoffDate);

  const currentMost = getMostFrequentCategory(recentSubmissions, categories);
  const previousMost = getMostFrequentCategory(olderSubmissions, categories);

  const current = currentMost?.categoryId || null;
  const previous = previousMost?.categoryId || null;

  return {
    current,
    previous,
    isChanging: current !== null && previous !== null && current !== previous,
  };
};

// Validates disaggregation key against defined dimensions
/**
 * Validate disaggregation key against defined dimensions
 */
export const validateDisaggregationKey = (
  disaggregationKey: string | null | undefined,
  categoryConfig: CategoryConfig | null,
): boolean => {
  const dimensions = categoryConfig?.disaggregationDimensions || [];
  if (dimensions.length === 0) {
    return true; // No dimensions defined, any key is valid
  }

  const normalizedKey = typeof disaggregationKey === "string"
    ? disaggregationKey.trim()
    : "";

  // Check if any dimension is required
  const requiredDimension = dimensions.find((d) => d.required);

  if (!normalizedKey) {
    if (requiredDimension) {
      throw new BadRequestError(
        "MISSING_DISAGGREGATION",
        `Disaggregation key is required for dimension: ${requiredDimension.label}`,
      );
    }
    return true;
  }

  // Check if this is a composite key (contains pipe delimiter)
  if (normalizedKey.includes("|")) {
    const parts = normalizedKey.split("|");
    for (const part of parts) {
      const colonIndex = part.indexOf(":");
      if (colonIndex === -1) {
        throw new BadRequestError(
          "INVALID_DISAGGREGATION_FORMAT",
          `Invalid composite key part: '${part}'. Expected format: dimensionKey:value`,
        );
      }
      const dimKey = part.substring(0, colonIndex).trim();
      const dimValue = part.substring(colonIndex + 1).trim();

      // Find matching dimension
      const matchingDim = dimensions.find((d) => d.key === dimKey || d.label === dimKey);
      if (!matchingDim) {
        throw new BadRequestError(
          "INVALID_DISAGGREGATION_DIMENSION",
          `Unknown disaggregation dimension: '${dimKey}'`,
        );
      }

      const validValues = matchingDim.values.map((v) => String(v).trim());
      if (!validValues.includes(dimValue)) {
        throw new BadRequestError(
          "INVALID_DISAGGREGATION_VALUE",
          `'${dimValue}' is not a valid value for ${matchingDim.label}. Valid values: ${validValues.slice(0, 5).join(", ")}${validValues.length > 5 ? "..." : ""}`,
        );
      }
    }

    // Check that all required dimensions are present in composite key
    const presentDimKeys = parts.map((p) => p.substring(0, p.indexOf(":")).trim());
    for (const dim of dimensions) {
      if (dim.required && !presentDimKeys.includes(dim.key)) {
        throw new BadRequestError(
          "MISSING_DISAGGREGATION",
          `Required disaggregation dimension '${dim.label}' is missing from composite key`,
        );
      }
    }

    return true;
  }

  // Simple key (single dimension) — backward compatible
  const primaryDimension = dimensions.find((d) => d.required) || dimensions[0];
  const validValues = primaryDimension.values.map((v) => String(v).trim());

  if (!validValues.includes(normalizedKey)) {
    throw new BadRequestError(
      "INVALID_DISAGGREGATION_VALUE",
      `'${normalizedKey}' is not a valid value for ${primaryDimension.label}. Valid values: ${validValues.slice(0, 5).join(", ")}${validValues.length > 5 ? "..." : ""}`,
    );
  }

  return true;
};

/**
 * Get disaggregated category distribution
 */
export interface DisaggregatedCategoryStats {
  disaggregationKey: string;
  disaggregationLabel: string;
  categoryDistribution: CategoryStats[];
  totalSubmissions: number;
  lastReportedAt: Date | null;
}

// Gets disaggregated category distribution stats
export const getDisaggregatedCategoryDistribution = (
  submissions: Array<{
    value?: string | null;
    categoryValue?: string | null;
    disaggregationKey?: string | null;
    reportedAt: Date;
  }>,
  categories: CategoryDefinition[],
  categoryConfig: CategoryConfig | null,
): DisaggregatedCategoryStats[] => {
  const disaggregationGroups = new Map<string, typeof submissions>();

  // Group submissions by disaggregation key
  submissions.forEach((sub) => {
    const key = sub.disaggregationKey || "_ungrouped";
    if (!disaggregationGroups.has(key)) {
      disaggregationGroups.set(key, []);
    }
    disaggregationGroups.get(key)!.push(sub);
  });

  // Calculate stats for each disaggregation group
  const stats: DisaggregatedCategoryStats[] = [];

  disaggregationGroups.forEach((groupSubmissions, key) => {
    const distribution = getCategoryDistribution(groupSubmissions, categories);
    const sortedByDate = [...groupSubmissions].sort(
      (a, b) => b.reportedAt.getTime() - a.reportedAt.getTime(),
    );

    stats.push({
      disaggregationKey: key,
      disaggregationLabel: key === "_ungrouped" ? "No Disaggregation" : key,
      categoryDistribution: distribution,
      totalSubmissions: groupSubmissions.length,
      lastReportedAt: sortedByDate[0]?.reportedAt || null,
    });
  });

  return stats.sort((a, b) => b.totalSubmissions - a.totalSubmissions);
};

/**
 * Calculate reporting compliance statistics
 */
export interface ReportingComplianceStats {
  expectedReports: number;
  receivedReports: number;
  complianceRate: number;
  onTimeReports: number;
  lateReports: number;
  missingReports: number;
  byDisaggregation: {
    [key: string]: {
      expected: number;
      received: number;
      rate: number;
      lastReportedAt: Date | null;
    };
  };
}

// Calculates reporting compliance statistics
export const calculateReportingCompliance = (
  submissions: Array<{
    value?: string | null;
    categoryValue?: string | null;
    disaggregationKey?: string | null;
    reportedAt: Date;
  }>,
  categoryConfig: CategoryConfig | null,
  startDate: Date,
  endDate: Date,
  reportingFrequency:
    | "DAILY"
    | "WEEKLY"
    | "MONTHLY"
    | "QUARTERLY"
    | "YEARLY" = "MONTHLY",
): ReportingComplianceStats => {
  const expectedEntities = categoryConfig?.expectedReportingEntities || 0;
  const disaggregationDimension = categoryConfig?.disaggregationDimensions?.[0];

  if (!disaggregationDimension || expectedEntities === 0) {
    return {
      expectedReports: 0,
      receivedReports: 0,
      complianceRate: 0,
      onTimeReports: 0,
      lateReports: 0,
      missingReports: 0,
      byDisaggregation: {},
    };
  }

  // Calculate expected reporting periods
  const periodCount = calculatePeriodCount(
    startDate,
    endDate,
    reportingFrequency,
  );
  const expectedReports = expectedEntities * periodCount;

  // Group submissions by disaggregation key
  const submissionsByEntity = new Map<string, typeof submissions>();
  submissions.forEach((sub) => {
    const key = sub.disaggregationKey || "_unknown";
    if (!submissionsByEntity.has(key)) {
      submissionsByEntity.set(key, []);
    }
    submissionsByEntity.get(key)!.push(sub);
  });

  // Calculate by disaggregation
  const byDisaggregation: ReportingComplianceStats["byDisaggregation"] = {};

  disaggregationDimension.values.forEach((entityValue) => {
    const entitySubmissions = submissionsByEntity.get(entityValue) || [];
    const received = entitySubmissions.length;
    const expected = periodCount;
    const lastReportedAt =
      entitySubmissions.length > 0
        ? entitySubmissions.sort(
            (a, b) => b.reportedAt.getTime() - a.reportedAt.getTime(),
          )[0].reportedAt
        : null;

    byDisaggregation[entityValue] = {
      expected,
      received,
      rate: expected > 0 ? (received / expected) * 100 : 0,
      lastReportedAt,
    };
  });

  const receivedReports = submissions.length;
  const missingReports = expectedReports - receivedReports;
  const complianceRate =
    expectedReports > 0 ? (receivedReports / expectedReports) * 100 : 0;

  // Calculate on-time vs late (for now, all received are considered on-time)
  const onTimeReports = receivedReports;
  const lateReports = 0;

  return {
    expectedReports,
    receivedReports,
    complianceRate,
    onTimeReports,
    lateReports,
    missingReports,
    byDisaggregation,
  };
};

const calculatePeriodCount = (
  startDate: Date,
  endDate: Date,
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY",
): number => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysDiff = Math.floor(
    (endDate.getTime() - startDate.getTime()) / msPerDay,
  );

  switch (frequency) {
    case "DAILY":
      return daysDiff + 1;
    case "WEEKLY":
      return Math.ceil(daysDiff / 7);
    case "MONTHLY":
      return Math.ceil(daysDiff / 30);
    case "QUARTERLY":
      return Math.ceil(daysDiff / 90);
    case "YEARLY":
      return Math.ceil(daysDiff / 365);
    default:
      return 1;
  }
};

/**
 * Time-series category statistics
 */
export interface CategoryTimeSeriesStats {
  period: string;
  startDate: Date;
  endDate: Date;
  categoryDistribution: CategoryStats[];
  totalSubmissions: number;
}

// Gets time-series category statistics
export const getCategoryTimeSeries = (
  submissions: Array<{
    value?: string | null;
    categoryValue?: string | null;
    reportedAt: Date;
  }>,
  categories: CategoryDefinition[],
  startDate: Date,
  endDate: Date,
  groupBy: "day" | "week" | "month" | "quarter" | "year" = "month",
): CategoryTimeSeriesStats[] => {
  const periods = generateTimePeriods(startDate, endDate, groupBy);

  return periods.map((period) => {
    const periodSubmissions = submissions.filter(
      (sub) =>
        sub.reportedAt >= period.startDate && sub.reportedAt <= period.endDate,
    );

    const distribution = getCategoryDistribution(periodSubmissions, categories);

    return {
      period: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
      categoryDistribution: distribution,
      totalSubmissions: periodSubmissions.length,
    };
  });
};

const generateTimePeriods = (
  startDate: Date,
  endDate: Date,
  groupBy: "day" | "week" | "month" | "quarter" | "year",
): Array<{ label: string; startDate: Date; endDate: Date }> => {
  const periods: Array<{ label: string; startDate: Date; endDate: Date }> = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const periodStart = new Date(currentDate);
    let periodEnd: Date;
    let label: string;

    switch (groupBy) {
      case "day":
        periodEnd = new Date(currentDate);
        label = currentDate.toISOString().split("T")[0];
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case "week":
        periodEnd = new Date(currentDate);
        periodEnd.setDate(periodEnd.getDate() + 6);
        label = `Week of ${currentDate.toISOString().split("T")[0]}`;
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case "month":
        periodEnd = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0,
        );
        label = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case "quarter":
        const quarter = Math.floor(currentDate.getMonth() / 3);
        periodEnd = new Date(currentDate.getFullYear(), (quarter + 1) * 3, 0);
        label = `${currentDate.getFullYear()}-Q${quarter + 1}`;
        currentDate.setMonth((quarter + 1) * 3);
        break;
      case "year":
        periodEnd = new Date(currentDate.getFullYear(), 11, 31);
        label = `${currentDate.getFullYear()}`;
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
      default:
        periodEnd = new Date(endDate);
        label = "Total";
        currentDate = new Date(endDate.getTime() + 1);
    }

    if (periodEnd > endDate) {
      periodEnd = new Date(endDate);
    }

    periods.push({
      label,
      startDate: periodStart,
      endDate: periodEnd,
    });
  }

  return periods;
};
