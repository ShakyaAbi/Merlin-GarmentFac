import { Indicator, IndicatorType } from "../../types";
import { formatNepaliDate } from "../../utils/nepaliDate";

export const formatDate = (value?: string) => {
  return formatNepaliDate(value, "");
};

export const parseNumericValue = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, "");
  const direct = Number(normalized);
  if (Number.isFinite(direct)) return direct;
  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

export type ForecastMethod = "LINEAR_REGRESSION" | "EXPONENTIAL_SMOOTHING";

export interface ForecastOptions {
  periods?: number;
  method?: ForecastMethod;
  alpha?: number;
  frequency?: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly";
}

export const generateForecast = (
  historicalData: any[],
  options: ForecastOptions = {},
) => {
  const {
    periods = 6,
    method = "EXPONENTIAL_SMOOTHING",
    alpha = 0.3, // Slightly higher for more weight on recent trends
    beta = 0.1,  // For Holt's trend smoothing
    frequency = "Weekly",
  } = options as any;

  if (historicalData.length < 2) return [];

  // Filter out anomalies and non-numeric values to prevent skewing the forecast
  const validData = historicalData.filter((d) =>
    Number.isFinite(parseNumericValue(d.value)) && !d.isAnomaly
  );
  
  // If we filtered too many anomalies, fallback to including them or return empty
  const dataToUse = validData.length >= 2 ? validData : historicalData.filter((d) =>
    Number.isFinite(parseNumericValue(d.value))
  );

  if (dataToUse.length < 2) return [];

  const forecast = [];
  const lastActual = historicalData[historicalData.length - 1];

  forecast.push({
    ...lastActual,
    value: parseNumericValue(lastActual.value),
    forecast: parseNumericValue(lastActual.value),
    isForecast: false,
  });

  let predictedValues: number[] = [];

  if (method === "LINEAR_REGRESSION") {
    const n = dataToUse.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0;

    dataToUse.forEach((point, i) => {
      const val = parseNumericValue(point.value) ?? 0;
      sumX += i;
      sumY += val;
      sumXY += i * val;
      sumXX += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Use n-1 + data length difference to align with historicalData.length
    const startX = historicalData.length - 1;
    for (let i = 1; i <= periods; i++) {
      predictedValues.push(slope * (startX + i) + intercept);
    }
  } else if (method === "EXPONENTIAL_SMOOTHING") {
    // Implementing Holt's Linear Trend (Double Exponential Smoothing)
    // for a forecast that captrues trends rather than being flat.
    let s = parseNumericValue(dataToUse[0].value) ?? 0;
    let b = (parseNumericValue(dataToUse[1].value) ?? 0) - s;
    
    for (let i = 1; i < dataToUse.length; i++) {
      const actualValue = parseNumericValue(dataToUse[i].value) ?? 0;
      const prevS = s;
      s = alpha * actualValue + (1 - alpha) * (s + b);
      b = beta * (s - prevS) + (1 - beta) * b;
    }

    for (let i = 1; i <= periods; i++) {
      predictedValues.push(s + i * b);
    }
  }

  let lastDate = new Date(historicalData[historicalData.length - 1].date);

  for (let i = 0; i < periods; i++) {
    const nextDate = new Date(lastDate);
    if (frequency === "Daily") {
      nextDate.setDate(lastDate.getDate() + 1);
    } else if (frequency === "Weekly") {
      nextDate.setDate(lastDate.getDate() + 7);
    } else if (frequency === "Monthly") {
      nextDate.setMonth(lastDate.getMonth() + 1);
    } else if (frequency === "Quarterly") {
      nextDate.setMonth(lastDate.getMonth() + 3);
    } else if (frequency === "Yearly") {
      nextDate.setFullYear(lastDate.getFullYear() + 1);
    }

    forecast.push({
      date: nextDate.toISOString().split("T")[0],
      forecast: parseFloat(predictedValues[i].toFixed(2)),
      value: null,
      isForecast: true,
    });
    lastDate = nextDate;
  }

  return forecast;
};

export const inferAnomalyReason = (
  indicator: Indicator,
  value: number,
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
  if (indicator.type === IndicatorType.PERCENTAGE) {
    const lower = indicator.minExpected ?? 0;
    const upper = indicator.maxExpected ?? 100;
    if (value < lower || value > upper) {
      return `Percent must be between ${lower} and ${upper}${suffix}`;
    }
  }
  if (
    indicator.type === IndicatorType.NUMBER ||
    indicator.type === IndicatorType.CURRENCY
  ) {
    if (
      indicator.minExpected !== undefined &&
      value < indicator.minExpected
    ) {
      return `Value below expected minimum (${indicator.minExpected})${suffix}`;
    }
    if (
      indicator.maxExpected !== undefined &&
      value > indicator.maxExpected
    ) {
      return `Value exceeds expected maximum (${indicator.maxExpected})${suffix}`;
    }
  }
  return `Anomaly detected${suffix}`;
};
