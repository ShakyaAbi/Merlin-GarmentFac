import { IndicatorDataType } from "@prisma/client";
import { config } from "../config/env";

export type ScoreRequest = {
  indicatorId: number;
  dataType: IndicatorDataType;
  values: number[];
  newValue: number;
  config: {
    method: string;
    contamination: number;
    windowSize: number;
    minPoints: number;
    seed?: number;
    zscore_threshold?: number;
  };
};

export type EvaluationRequest = {
  indicatorId: number;
  dataType: IndicatorDataType;
  values: number[];
  labels: boolean[];
  config: ScoreRequest["config"];
  compareAll?: boolean;
};

export type EvaluationResult = {
  method: string;
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  confusionMatrix: {
    tp: number;
    fp: number;
    tn: number;
    fn: number;
  };
};

export type ScoreResult = {
  isAnomaly: boolean;
  score: number;
  threshold: number;
  method: string;
  reason: string;
  meta?: Record<string, any> | null;
};

export type MlHealthStatus = {
  reachable: boolean;
  latencyMs: number | null;
  checkedAt: string;
  lastError?: string;
};

// Error type for ML service failures
export class MlServiceError extends Error {
  type: "CONFIG" | "TIMEOUT" | "HTTP" | "NETWORK";
  statusCode?: number;

  constructor(
    type: "CONFIG" | "TIMEOUT" | "HTTP" | "NETWORK",
    message: string,
    statusCode?: number,
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
  }
}

// Builds headers for ML requests
const buildHeaders = () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.mlServiceApiKey) {
    headers["Authorization"] = `Bearer ${config.mlServiceApiKey}`;
  }
  return headers;
};

// Calls an ML endpoint with JSON payload
const callMlEndpoint = async (
  path: string,
  payload: unknown,
): Promise<Response> => {
  if (!config.mlServiceUrl) {
    throw new MlServiceError("CONFIG", "ML service URL is not configured");
  }

  const baseUrl = config.mlServiceUrl.replace(/\/$/, "");
  try {
    return await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.mlServiceTimeoutMs),
    });
  } catch (error: any) {
    if (error?.name === "TimeoutError") {
      throw new MlServiceError(
        "TIMEOUT",
        `ML service timed out after ${config.mlServiceTimeoutMs}ms`,
      );
    }
    throw new MlServiceError(
      "NETWORK",
      `ML service network error: ${error?.message || "Unknown error"}`,
    );
  }
};

// Scores a single submission
export const scoreSubmission = async (
  payload: ScoreRequest,
): Promise<ScoreResult> => {
  const res = await callMlEndpoint("/score", payload);

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new MlServiceError(
      "HTTP",
      `ML service error: ${message || res.statusText}`,
      res.status,
    );
  }

  return (await res.json()) as ScoreResult;
};

// Scores a batch of values
export const scoreBatch = async (payload: {
  indicatorId: number;
  dataType: IndicatorDataType;
  values: number[];
  config: ScoreRequest["config"];
}): Promise<{ results: ScoreResult[] }> => {
  const res = await callMlEndpoint("/score/batch", payload);

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new MlServiceError(
      "HTTP",
      `ML service error: ${message || res.statusText}`,
      res.status,
    );
  }

  return (await res.json()) as { results: ScoreResult[] };
};

// Checks ML service health
export const healthCheck = async (): Promise<MlHealthStatus> => {
  const checkedAt = new Date().toISOString();
  if (!config.mlServiceUrl) {
    return {
      reachable: false,
      latencyMs: null,
      checkedAt,
      lastError: "ML service URL is not configured",
    };
  }

  const baseUrl = config.mlServiceUrl.replace(/\/$/, "");
  const startedAt = Date.now();
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: buildHeaders(),
      signal: AbortSignal.timeout(config.mlServiceTimeoutMs),
    });
    if (!res.ok) {
      const message = await res.text().catch(() => res.statusText);
      return {
        reachable: false,
        latencyMs: Date.now() - startedAt,
        checkedAt,
        lastError: message || res.statusText,
      };
    }
    return {
      reachable: true,
      latencyMs: Date.now() - startedAt,
      checkedAt,
    };
  } catch (error: any) {
    return {
      reachable: false,
      latencyMs: Date.now() - startedAt,
      checkedAt,
      lastError: error?.message || "ML health check failed",
    };
  }
};

// Evaluates ML models against labeled data
export const evaluateModels = async (
  payload: EvaluationRequest,
): Promise<{ results: EvaluationResult[] }> => {
  const res = await callMlEndpoint("/evaluate", payload);

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new MlServiceError(
      "HTTP",
      `ML service error: ${message || res.statusText}`,
      res.status,
    );
  }

  return (await res.json()) as { results: EvaluationResult[] };
};

// Fetches supported ML algorithms
export const getAlgorithms = async (): Promise<{ algorithms: any[] }> => {
  const res = await callMlEndpoint("/algorithms", {});

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new MlServiceError(
      "HTTP",
      `ML service error: ${message || res.statusText}`,
      res.status,
    );
  }

  return (await res.json()) as { algorithms: any[] };
};
