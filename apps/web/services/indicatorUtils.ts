import { Indicator, IndicatorType } from "../types";
import { formatNepaliDate } from "../utils/nepaliDate";

export const formatDate = (value: string) => {
  return formatNepaliDate(value, "");
};

export const formatCategoryValue = (
  value: string | number | undefined,
  categories?: any[],
): string => {
  if (!categories || categories.length === 0) {
    return String(value ?? "");
  }

  if (value === undefined || value === null || value === "") return "";

  const categoryIds = String(value).split(",");
  const labels = categoryIds
    .map((id) => {
      const cat = categories.find((c) => c.id === id.trim());
      return cat?.label || id;
    })
    .filter(Boolean);

  return labels.length > 0 ? labels.join(", ") : String(value);
};

export const formatCategoricalDisplay = (
  value: string | number | undefined,
  categoryValue: string | undefined,
  indicatorType: IndicatorType,
  categories?: any[],
): string => {
  if (categoryValue) {
    const label = formatCategoryValue(categoryValue, categories);
    if (label) return label;
  }
  if (
    indicatorType === IndicatorType.CATEGORICAL &&
    value !== undefined &&
    value !== null &&
    value !== ""
  ) {
    const label = formatCategoryValue(String(value), categories);
    if (label && label !== String(value)) return label;
  }
  return String(value ?? "N/A");
};

export const inferAnomalyReason = (
  value: number | string,
  indicator: Indicator,
  existing?: string,
  isAnomaly?: boolean,
  score?: number,
  threshold?: number,
) => {
  if (!isAnomaly) return "";
  const suffix =
    score !== undefined && threshold !== undefined
      ? ` (score: ${score.toFixed(3)}, threshold: ${threshold.toFixed(3)})`
      : "";
  if (existing && existing.trim()) return `${existing}${suffix}`;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return `Anomaly detected${suffix}`;
  if (indicator.type === IndicatorType.PERCENTAGE) {
    const lower = indicator.minExpected ?? 0;
    const upper = indicator.maxExpected ?? 100;
    if (numericValue < lower)
      return `Percent must be between ${lower} and ${upper}${suffix}`;
    if (numericValue > upper)
      return `Percent must be between ${lower} and ${upper}${suffix}`;
  }
  if (
    indicator.type === IndicatorType.NUMBER ||
    indicator.type === IndicatorType.CURRENCY
  ) {
    if (
      indicator.minExpected !== undefined &&
      numericValue < indicator.minExpected
    ) {
      return `Value below expected minimum (${indicator.minExpected})${suffix}`;
    }
    if (
      indicator.maxExpected !== undefined &&
      numericValue > indicator.maxExpected
    ) {
      return `Value exceeds expected maximum (${indicator.maxExpected})${suffix}`;
    }
  }
  return `Anomaly detected${suffix}`;
};

export const isNumericInputType = (type: IndicatorType) =>
  type === IndicatorType.NUMBER ||
  type === IndicatorType.PERCENTAGE ||
  type === IndicatorType.CURRENCY;
