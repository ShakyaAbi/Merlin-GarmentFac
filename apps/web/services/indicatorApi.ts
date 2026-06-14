import { request } from "./apiClient";
import { Indicator, IndicatorValue, IndicatorType } from "../types";

const mapIndicatorType = (dataType?: string, unit?: string): IndicatorType => {
  switch (dataType) {
    case "PERCENT":
      return IndicatorType.PERCENTAGE;
    case "BOOLEAN":
      return IndicatorType.BOOLEAN;
    case "CATEGORICAL":
      return IndicatorType.CATEGORICAL;
    case "NUMBER":
      return unit === "NPR" || unit === "npr"
        ? IndicatorType.CURRENCY
        : IndicatorType.NUMBER;
    case "TEXT":
      return IndicatorType.TEXT;
    default:
      if (unit === "%" || unit === "percent") return IndicatorType.PERCENTAGE;
      return IndicatorType.NUMBER;
  }
};

const mapIndicatorValue = (v: any, type: IndicatorType): IndicatorValue => {
  const isNumericType =
    type === IndicatorType.NUMBER ||
    type === IndicatorType.PERCENTAGE ||
    type === IndicatorType.CURRENCY;
  const parsedValue = isNumericType ? Number(v.value) : v.value;
  const isAnomaly = v.isAnomaly === true;
  const rawCategoryValue =
    v.categoryValue ??
    (type === IndicatorType.CATEGORICAL &&
    typeof v.value === "string" &&
    !Number.isFinite(Number(v.value))
      ? v.value
      : undefined);
  return {
    id: String(v.id),
    indicatorId: v.indicatorId ? String(v.indicatorId) : undefined,
    date: v.reportedAt ? new Date(v.reportedAt).toISOString() : "",
    value: Number.isFinite(parsedValue) ? parsedValue : v.value,
    categoryValue: rawCategoryValue ?? undefined,
    isAnomaly,
    anomalyReason: isAnomaly ? (v.anomalyReason ?? undefined) : undefined,
    anomalyScore: v.anomalyScore ?? undefined,
    anomalyThreshold: v.anomalyThreshold ?? undefined,
    anomalyMethod: v.anomalyMethod ?? undefined,
    anomalyMeta: v.anomalyMeta ?? undefined,
    evidence: v.evidence ?? undefined,
    createdByUserId: v.createdByUserId ? String(v.createdByUserId) : undefined,
    createdAt: v.createdAt ? new Date(v.createdAt).toISOString() : undefined,
    deletedAt: v.deletedAt ? new Date(v.deletedAt).toISOString() : undefined,
    deletedByUserId: v.deletedByUserId ? String(v.deletedByUserId) : undefined,
    updatedAt: v.updatedAt ? new Date(v.updatedAt).toISOString() : undefined,
    updatedByUserId: v.updatedByUserId ? String(v.updatedByUserId) : undefined,
    disaggregationKey: v.disaggregationKey ?? undefined,
  };
};

const mapIndicator = (
  indicator: any,
  values: IndicatorValue[] = [],
): Indicator => {
  const type = mapIndicatorType(indicator.dataType, indicator.unit);
  const isText = type === IndicatorType.TEXT;
  const isCategorical = type === IndicatorType.CATEGORICAL;
  const reportingFrequency =
    indicator.validationConfig?.reportingFrequency ||
    indicator.frequency ||
    "WEEKLY";
  return {
    id: String(indicator.id),
    projectId: String(indicator.projectId),
    nodeId: String(indicator.logframeNodeId),
    name: indicator.name ?? "",
    description: indicator.description ?? undefined,
    status: indicator.status ?? "Active",
    code: indicator.code ?? undefined,
    type,
    target: isCategorical
      ? (indicator.targetCategory ?? "")
      : indicator.targetValue ?? (isText ? "" : 0),
    baseline: isCategorical
      ? (indicator.baselineCategory ?? "")
      : indicator.baselineValue ?? (isText ? "" : 0),
    baselineCategory: indicator.baselineCategory ?? undefined,
    targetCategory: indicator.targetCategory ?? undefined,
    minExpected: indicator.minValue ?? undefined,
    maxExpected: indicator.maxValue ?? undefined,
    anomalyConfig: indicator.anomalyConfig ?? undefined,
    unit: indicator.unit ?? undefined,
    decimals: indicator.decimals ?? undefined,
    categories: indicator.categories ?? undefined,
    categoryConfig: indicator.categoryConfig ?? undefined,
    frequency:
      reportingFrequency === "DAILY"
        ? "Daily"
        : reportingFrequency === "WEEKLY"
          ? "Weekly"
          : "Monthly",
    currentVersion: indicator.currentVersion ?? 1,
    versions: Array.isArray(indicator.versions) ? indicator.versions : [],
    values,
    reminderEnabled: indicator.reminderEnabled ?? false,
    reminderDaysBeforeDue: indicator.reminderDaysBeforeDue ?? undefined,
    reminderDaysAfterDue: indicator.reminderDaysAfterDue ?? undefined,
    reminderRecipients: indicator.reminderRecipients ?? undefined,
  };
};

const toReportingFrequency = (value?: Indicator["frequency"]) => {
  if (!value) return undefined;
  switch (value) {
    case "Daily": return "DAILY";
    case "Weekly": return "WEEKLY";
    case "Monthly": return "MONTHLY";
    case "Quarterly": return "QUARTERLY";
    case "Yearly": return "YEARLY";
    default: return "WEEKLY";
  }
};

const normalizeDisaggregationDimensionKey = (value: any, fallbackLabel?: any) => {
  const raw = String(value ?? "").trim() || String(fallbackLabel ?? "").trim();
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const normalizeCategoryConfigForApi = (categoryConfig?: any | null) => {
  if (!categoryConfig) return categoryConfig ?? null;
  const dims = Array.isArray(categoryConfig.disaggregationDimensions)
    ? categoryConfig.disaggregationDimensions
        .map((dim: any) => {
          const label = String(dim?.label ?? "").trim();
          const key = normalizeDisaggregationDimensionKey(dim?.key, label);
          const values = Array.isArray(dim?.values)
            ? dim.values
                .map((v: any) => String(v).trim())
                .filter((v: string) => v.length > 0)
            : [];

          return {
            ...dim,
            key,
            label,
            values,
            required: typeof dim?.required === "boolean" ? dim.required : false,
          };
        })
        .filter(
          (dim: any) =>
            dim.key.length > 0 || dim.label.length > 0 || dim.values.length > 0,
        )
    : undefined;

  return {
    ...categoryConfig,
    disaggregationDimensions: dims,
  };
};

export const indicatorApi = {
  getIndicators: async (projectId: string): Promise<Indicator[]> => {
    const indicators = await request<any[]>(
      `/projects/${projectId}/indicators`,
    );
    return indicators.map((indicator) => {
      const type = mapIndicatorType(indicator.dataType, indicator.unit);
      const values = Array.isArray(indicator.submissions) 
        ? indicator.submissions.map((v: any) => mapIndicatorValue(v, type))
        : [];
      return mapIndicator(indicator, values);
    });
  },
  getIndicator: async (id: string): Promise<Indicator> => {
    const indicator = await request<any>(`/indicators/${id}?includeSubmissions=true`);
    const type = mapIndicatorType(indicator.dataType, indicator.unit);
    const values = Array.isArray(indicator.submissions)
      ? indicator.submissions.map((v: any) => mapIndicatorValue(v, type))
      : [];
    return mapIndicator(indicator, values);
  },
  deleteIndicator: async (id: string): Promise<void> =>
    request(`/indicators/${id}`, { method: "DELETE" }),
  createIndicator: async (
    projectId: string,
    payload: Partial<Indicator>,
  ): Promise<Indicator> => {
    const dataType =
      payload.type === IndicatorType.PERCENTAGE
        ? "PERCENT"
        : payload.type === IndicatorType.BOOLEAN
          ? "BOOLEAN"
          : payload.type === IndicatorType.TEXT
            ? "TEXT"
            : payload.type === IndicatorType.CATEGORICAL
              ? "CATEGORICAL"
              : "NUMBER";
    const isNumeric =
      payload.type === IndicatorType.NUMBER ||
      payload.type === IndicatorType.PERCENTAGE ||
      payload.type === IndicatorType.CURRENCY;
    const isCategorical = payload.type === IndicatorType.CATEGORICAL;
    const unit =
      payload.unit ||
      (payload.type === IndicatorType.BOOLEAN
        ? "yes/no"
        : payload.type === IndicatorType.TEXT
          ? "text"
          : payload.type === IndicatorType.CATEGORICAL
            ? "category"
            : "unit");

    const baselineValue =
      isNumeric && payload.baseline !== undefined
        ? Number(payload.baseline)
        : null;
    const targetValue =
      isNumeric && payload.target !== undefined ? Number(payload.target) : null;
    const baselineCategory =
      isCategorical && payload.baseline !== undefined
        ? String(payload.baseline)
        : null;
    const targetCategory =
      isCategorical && payload.target !== undefined
        ? String(payload.target)
        : null;

    const created = await request<any>(`/projects/${projectId}/indicators`, {
      method: "POST",
      body: {
        logframeNodeId: Number(payload.nodeId),
        name: payload.name,
        unit,
        baselineValue,
        targetValue,
        baselineCategory,
        targetCategory,
        dataType,
        minValue: payload.minExpected ?? null,
        maxValue: payload.maxExpected ?? null,
        anomalyConfig: payload.anomalyConfig ?? null,
        reportingFrequency: toReportingFrequency(payload.frequency),
        categories: payload.categories ?? null,
        categoryConfig: normalizeCategoryConfigForApi(payload.categoryConfig),
        reminderEnabled: payload.reminderEnabled ?? false,
        reminderDaysBeforeDue: payload.reminderDaysBeforeDue ?? null,
        reminderDaysAfterDue: payload.reminderDaysAfterDue ?? null,
        reminderRecipients: payload.reminderRecipients ?? null,
      },
    });
    return mapIndicator(created);
  },
  updateIndicator: async (
    indicatorId: string,
    payload: Partial<Indicator>,
  ): Promise<Indicator> => {
    const body: any = {
      logframeNodeId: payload.nodeId ? Number(payload.nodeId) : undefined,
      name: payload.name,
    };

    if (payload.type !== undefined) {
      body.dataType =
        payload.type === IndicatorType.PERCENTAGE
          ? "PERCENT"
          : payload.type === IndicatorType.BOOLEAN
            ? "BOOLEAN"
            : payload.type === IndicatorType.TEXT
              ? "TEXT"
              : payload.type === IndicatorType.CATEGORICAL
                ? "CATEGORICAL"
                : "NUMBER";
    }

    if (payload.unit !== undefined) {
      body.unit = payload.unit;
    }

    const type = payload.type; 
    const isNumeric = type === IndicatorType.NUMBER || type === IndicatorType.PERCENTAGE || type === IndicatorType.CURRENCY;
    const isCategorical = type === IndicatorType.CATEGORICAL;

    if (payload.baseline !== undefined) {
      if (isNumeric) body.baselineValue = Number(payload.baseline);
      else if (isCategorical) body.baselineCategory = String(payload.baseline);
    }
    if (payload.target !== undefined) {
      if (isNumeric) body.targetValue = Number(payload.target);
      else if (isCategorical) body.targetCategory = String(payload.target);
    }

    if (payload.minExpected !== undefined) body.minValue = payload.minExpected;
    if (payload.maxExpected !== undefined) body.maxValue = payload.maxExpected;
    if (payload.anomalyConfig !== undefined) body.anomalyConfig = payload.anomalyConfig;
    if (payload.frequency !== undefined) body.reportingFrequency = toReportingFrequency(payload.frequency);
    if (payload.categories !== undefined) body.categories = payload.categories;
    if (payload.categoryConfig !== undefined) body.categoryConfig = normalizeCategoryConfigForApi(payload.categoryConfig);
    
    if (payload.reminderEnabled !== undefined) body.reminderEnabled = payload.reminderEnabled;
    if (payload.reminderDaysBeforeDue !== undefined) body.reminderDaysBeforeDue = payload.reminderDaysBeforeDue;
    if (payload.reminderDaysAfterDue !== undefined) body.reminderDaysAfterDue = payload.reminderDaysAfterDue;
    if (payload.reminderRecipients !== undefined) body.reminderRecipients = payload.reminderRecipients;

    const updated = await request<any>(`/indicators/${indicatorId}`, {
      method: "PATCH",
      body,
    });
    return mapIndicator(updated);
  },
  getReportingGaps: async (
    indicatorId: string,
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY",
  ): Promise<any> =>
    request(`/indicators/${indicatorId}/gaps?frequency=${frequency}`),
  getCategoryDistribution: async (indicatorId: string): Promise<any> =>
    request(`/indicators/${indicatorId}/category-distribution`),
  getMLAlgorithms: async (): Promise<any[]> => {
    const res = await request<any>("/ml/algorithms");
    return res.algorithms || [];
  },
  evaluateML: async (
    indicatorId: string,
    compareAll = false,
  ): Promise<any> => {
    const suffix = compareAll ? "?compareAll=true" : "";
    return request(`/indicators/${indicatorId}/ml-evaluate${suffix}`, {
      method: "POST",
    });
  },
  recalculateIndicatorAnomalies: async (
    indicatorId: string,
  ): Promise<any> =>
    request(`/indicators/${indicatorId}/anomalies/recalculate`, {
      method: "POST",
    }),
};

export const submissionApi = {
  getIndicatorSubmissions: async (
    indicatorId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<IndicatorValue[]> => {
    const params = new URLSearchParams();
    if (options?.includeDeleted) params.set("includeDeleted", "true");
    const suffix = params.toString() ? `?${params.toString()}` : "";
    
    const submissions = await request<any[]>(
      `/indicators/${indicatorId}/submissions${suffix}`,
    );
    const indicator = await request<any>(`/indicators/${indicatorId}`);
    const type = mapIndicatorType(indicator.dataType, indicator.unit);
    return submissions.map((submission) => mapIndicatorValue(submission, type));
  },
  createSubmission: async (
    indicatorId: string,
    payload: {
      reportedAt: string;
      value: any;
      evidence?: string | null;
      categoryValue?: string | null;
      disaggregationKey?: string | null;
    },
    file?: File | null,
  ): Promise<IndicatorValue> => {
    if (file) {
      const formData = new FormData();
      formData.append("reportedAt", payload.reportedAt);
      formData.append("value", String(payload.value));
      if (payload.categoryValue)
        formData.append("categoryValue", payload.categoryValue);
      if (payload.disaggregationKey)
        formData.append("disaggregationKey", payload.disaggregationKey);
      formData.append("file", file);
      return request<IndicatorValue>(
        `/indicators/${indicatorId}/submissions`,
        {
          method: "POST",
          body: formData,
        },
      );
    }

    return request<IndicatorValue>(`/indicators/${indicatorId}/submissions`, {
      method: "POST",
      body: {
        reportedAt: payload.reportedAt,
        value: payload.value,
        evidence: payload.evidence ?? null,
        categoryValue: payload.categoryValue ?? null,
        disaggregationKey: payload.disaggregationKey ?? null,
      },
    });
  },
  updateSubmission: async (
    submissionId: string,
    payload: {
      reportedAt: string;
      value: any;
      evidence?: string;
      categoryValue?: string;
      disaggregationKey?: string;
    },
  ) =>
    request(`/submissions/${submissionId}`, {
      method: "PATCH",
      body: {
        reportedAt: payload.reportedAt,
        value: payload.value,
        evidence: payload.evidence ?? null,
        categoryValue: payload.categoryValue ?? null,
        disaggregationKey: payload.disaggregationKey ?? null,
      },
    }),
  deleteSubmission: async (submissionId: string): Promise<void> =>
    request(`/submissions/${submissionId}`, { method: "DELETE" }),
  restoreSubmission: async (submissionId: string) =>
    request(`/submissions/${submissionId}/restore`, { method: "POST" }),
};
