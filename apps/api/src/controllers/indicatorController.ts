import { Request, Response } from "express";
import * as indicatorService from "../services/indicatorService";
import { asyncHandler } from "../utils/asyncHandler";

// Creates a new indicator for a project
export const createIndicator = asyncHandler(
  async (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId);
    const userId = req.user?.id || 1;
    const indicator = await indicatorService.createIndicator(
      projectId,
      req.user!.organizationId,
      req.body,
      userId,
    );
    res.status(201).json(indicator);
  },
);


// Lists all indicators for a project
export const getIndicatorsByProject = asyncHandler(
  async (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId);
    const includeDeleted = req.query.includeDeleted === "true";
    const indicators = await indicatorService.getIndicators(projectId, req.user!.organizationId, includeDeleted);
    res.json(indicators);
  },
);


// Gets a single indicator by ID
export const getIndicator = asyncHandler(
  async (req: Request, res: Response) => {
    const includeSubmissions = req.query.includeSubmissions === "true";
    const includeDeleted = req.query.includeDeleted === "true";
    const indicator = await indicatorService.getIndicatorById(
      Number(req.params.id),
      req.user!.organizationId,
      includeSubmissions,
      includeDeleted,
    );
    res.json(indicator);
  },
);

// Updates an existing indicator
export const updateIndicator = asyncHandler(
  async (req: Request, res: Response) => {
    const indicator = await indicatorService.updateIndicator(
      Number(req.params.id),
      req.user!.organizationId,
      req.body,
    );
    res.json(indicator);
  },
);

// Recalculates anomaly detection for an indicator
export const recalculateIndicatorAnomalies = asyncHandler(
  async (req: Request, res: Response) => {
    await indicatorService.recalculateIndicatorAnomalies(
      Number(req.params.id),
      req.user!.organizationId,
    );
    res.json({ success: true });
  },
);

// Gets indicator with statistical data
export const getIndicatorStats = asyncHandler(
  async (req: Request, res: Response) => {
    const includeDeleted = req.query.includeDeleted === "true";
    const indicator = await indicatorService.getIndicatorWithStats(
      Number(req.params.id),
      req.user!.organizationId,
      includeDeleted,
    );
    res.json(indicator);
  },
);

// Detects reporting gaps for an indicator
export const getReportingGaps = asyncHandler(
  async (req: Request, res: Response) => {
    const indicator = await indicatorService.getIndicatorById(
      Number(req.params.id),
      req.user!.organizationId,
      true,
    );

    const frequency =
      (req.query.frequency as "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY") || "MONTHLY";
    const submissions = (indicator as any).submissions || [];
    const gaps = indicatorService.detectReportingGaps(submissions, frequency);

    res.json({
      indicatorId: indicator.id,
      frequency,
      totalSubmissions: submissions.length,
      gaps,
    });
  },
);

// Gets category distribution for categorical indicators
export const getCategoryDistribution = asyncHandler(
  async (req: Request, res: Response) => {
    const includeDeleted = req.query.includeDeleted === "true";
    const indicatorWithStats = await indicatorService.getIndicatorWithStats(
      Number(req.params.id),
      req.user!.organizationId,
      includeDeleted,
    );

    if (indicatorWithStats.dataType !== "CATEGORICAL") {
      res.status(400).json({
        error: {
          code: "NOT_CATEGORICAL",
          message: "This endpoint only works with CATEGORICAL indicators",
        },
      });
      return;
    }

    res.json({
      indicatorId: indicatorWithStats.id,
      indicatorName: indicatorWithStats.name,
      categories: indicatorWithStats.categories,
      distribution:
        (indicatorWithStats.stats as any)?.categoryDistribution || [],
      mostFrequent: (indicatorWithStats.stats as any)?.mostFrequent || null,
      totalSubmissions: (indicatorWithStats.stats as any)?.submissionCount || 0,
    });
  },
);

// Soft-deletes an indicator
export const deleteIndicator = asyncHandler(
  async (req: Request, res: Response) => {
    await indicatorService.deleteIndicator(Number(req.params.id), req.user!.organizationId);
    res.status(204).send();
  },
);

// Gets import templates for an indicator
export const getIndicatorTemplates = asyncHandler(
  async (req: Request, res: Response) => {
    const templates = await indicatorService.getIndicatorTemplates(
      Number(req.params.id),
      req.user!.organizationId,
    );
    res.json(templates);
  },
);

// Gets disaggregated category statistics
export const getDisaggregatedCategoryStats = asyncHandler(
  async (req: Request, res: Response) => {
    const includeDeleted = req.query.includeDeleted === "true";
    const stats = await indicatorService.getDisaggregatedCategoryStats(
      Number(req.params.id),
      req.user!.organizationId,
      includeDeleted,
    );
    res.json(stats);
  },
);
// Gets reporting compliance for a date range
export const getReportingCompliance = asyncHandler(
  async (req: Request, res: Response) => {
    const { startDate, endDate, reportingFrequency } = req.query;
    
    if (!startDate || !endDate) {
      res.status(400).json({
        error: {
          code: "MISSING_DATES",
          message: "startDate and endDate are required",
        },
      });
      return;
    }

    const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
    const frequency = (reportingFrequency as string)?.toUpperCase() || 'MONTHLY';
    
    if (!validFrequencies.includes(frequency)) {
      res.status(400).json({
        error: {
          code: "INVALID_FREQUENCY",
          message: `reportingFrequency must be one of: ${validFrequencies.join(', ')}`,
        },
      });
      return;
    }

    const compliance = await indicatorService.getReportingCompliance(
      Number(req.params.id),
      req.user!.organizationId,
      new Date(startDate as string),
      new Date(endDate as string),
      frequency as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
    );
    res.json(compliance);
  }
);

// Gets category time series data
export const getCategoryTimeSeries = asyncHandler(
  async (req: Request, res: Response) => {
    const { startDate, endDate, groupBy, disaggregationKey } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        error: {
          code: "MISSING_DATES",
          message: "startDate and endDate are required",
        },
      });
      return;
    }

    const validGroupBy = ['day', 'week', 'month', 'quarter', 'year'];
    const group = (groupBy as string) || 'month';

    if (!validGroupBy.includes(group)) {
      res.status(400).json({
        error: {
          code: "INVALID_GROUP_BY",
          message: `groupBy must be one of: ${validGroupBy.join(', ')}`,
        },
      });
      return;
    }

    const timeSeries = await indicatorService.getCategoryTimeSeriesStats(
      Number(req.params.id),
      req.user!.organizationId,
      new Date(startDate as string),
      new Date(endDate as string),
      group as 'day' | 'week' | 'month' | 'quarter' | 'year'
    );
    res.json(timeSeries);
  }
);

// Lists available ML algorithms
export const getMLAlgorithms = asyncHandler(
  async (_req: Request, res: Response) => {
    const algorithms = await indicatorService.getMLAlgorithms();
    res.json(algorithms);
  },
);

// Evaluates ML models for a given indicator
export const evaluateML = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const indicatorId = Number(req.params.id);
      const compareAll = req.query.compareAll === "true";
      const results = await indicatorService.evaluateML(indicatorId, req.user!.organizationId, compareAll);
      res.json(results);
    } catch (error: any) {
      if (error.type === "NETWORK" || error.type === "CONNECTION") {
        res.status(503).json({
          error: {
            code: "ML_SERVICE_UNAVAILABLE",
            message: "The ML service is currently offline. Please start it using 'cd apps/ml && uvicorn app:app --port 8000'",
          },
        });
        return;
      }
      throw error;
    }
  },
);