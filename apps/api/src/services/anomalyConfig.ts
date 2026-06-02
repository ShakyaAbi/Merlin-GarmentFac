export type AnomalyConfig = {
  enabled?: boolean;
  mode?: "RULES" | "ML";
  rules?: {
    range?: boolean;
    maxChangePercent?: number;
  };
  outlier?: {
    method?: "MAD" | "IQR";
    threshold?: number;
    windowSize?: number;
    minPoints?: number;
  };
  trend?: {
    method?: "SLOPE_SHIFT" | "MEAN_SHIFT";
    threshold?: number;
    windowSize?: number;
  };
  ml?: {
    method?: "ISOLATION_FOREST";
    contamination?: number;
    windowSize?: number;
    minPoints?: number;
    seed?: number;
  };
  fallback?: {
    useRangeChecks?: boolean;
    useRulesWhenInsufficientData?: boolean;
    useRulesOnServiceError?: boolean;
  };
};

// Default anomaly detection configuration
export const defaultAnomalyConfig: Required<Pick<AnomalyConfig, "enabled">> &
   AnomalyConfig = {
   enabled: true,
   mode: "RULES",
   rules: {
     range: true,
     maxChangePercent: 50,
   },
   outlier: { method: "MAD", threshold: 3.5, windowSize: 8, minPoints: 6 },
   trend: { method: "SLOPE_SHIFT", threshold: 2, windowSize: 6 },
   ml: {
     method: "ISOLATION_FOREST",
     contamination: 0.05,
     windowSize: 50,
     minPoints: 5,
     seed: 42,
   },
   fallback: {
     useRangeChecks: true,
     useRulesWhenInsufficientData: true,
     useRulesOnServiceError: true,
   },
 };

// Normalizes and merges partial config with defaults
export const normalizeAnomalyConfig = (
  config?: AnomalyConfig | null,
): AnomalyConfig => ({
  ...defaultAnomalyConfig,
  ...(config ?? {}),
  rules: { ...defaultAnomalyConfig.rules, ...(config?.rules ?? {}) },
  outlier: { ...defaultAnomalyConfig.outlier, ...(config?.outlier ?? {}) },
  trend: { ...defaultAnomalyConfig.trend, ...(config?.trend ?? {}) },
  ml: { ...defaultAnomalyConfig.ml, ...(config?.ml ?? {}) },
  fallback: {
    ...defaultAnomalyConfig.fallback,
    ...(config?.fallback ?? {}),
  },
});
