import { Request, Response } from "express";
import * as submissionService from "../services/submissionService";
import { asyncHandler } from "../utils/asyncHandler";

// Creates a new submission for an indicator
export const createSubmission = asyncHandler(
  async (req: Request, res: Response) => {
    const indicatorId = Number(req.params.indicatorId);

    // If a file was uploaded, set the evidence to the file URL
    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      req.body.evidence = `${baseUrl}/uploads/${req.file.filename}`;
    }

    const submission = await submissionService.createSubmission(
      indicatorId,
      req.user!.organizationId,
      req.body,
      req.user!.id
    );
    res.status(201).json(submission);
  }
);

// Lists submissions for an indicator
export const listSubmissions = asyncHandler(
  async (req: Request, res: Response) => {
    const indicatorId = Number(req.params.indicatorId);
    const submissions = await submissionService.listSubmissions(
      indicatorId,
      req.user!.organizationId,
      req.query as any
    );
    res.json(submissions);
  }
);

// Updates an existing submission
export const updateSubmission = asyncHandler(
  async (req: Request, res: Response) => {
    const submissionId = Number(req.params.id);
    const submission = await submissionService.updateSubmission(
      submissionId,
      req.user!.organizationId,
      req.body,
      req.user!.id,
      req.user!.role,
    );
    res.json(submission);
  },
);

// Soft-deletes a submission
export const deleteSubmission = asyncHandler(
  async (req: Request, res: Response) => {
    const submissionId = Number(req.params.id);
    await submissionService.deleteSubmission(
      submissionId,
      req.user!.organizationId,
      req.user!.id,
      req.user!.role,
    );
    res.status(204).send();
  },
);

// Restores a soft-deleted submission
export const restoreSubmission = asyncHandler(
  async (req: Request, res: Response) => {
    const submissionId = Number(req.params.id);
    const submission = await submissionService.restoreSubmission(
      submissionId,
      req.user!.organizationId,
      req.user!.id,
    );
    res.json(submission);
  },
);

// Acknowledges an anomaly on a submission
export const acknowledgeAnomaly = asyncHandler(
  async (req: Request, res: Response) => {
    const submissionId = Number(req.params.id);
    const submission = await submissionService.acknowledgeAnomaly(
      submissionId,
      req.user!.organizationId,
      req.user!.id,
      req.body.notes
    );
    res.json(submission);
  }
);

// Resolves an anomaly on a submission
export const resolveAnomaly = asyncHandler(
  async (req: Request, res: Response) => {
    const submissionId = Number(req.params.id);
    const submission = await submissionService.resolveAnomaly(
      submissionId,
      req.user!.organizationId,
      req.user!.id,
      req.body.notes
    );
    res.json(submission);
  }
);

// Marks an anomaly as false positive
export const markAnomalyFalsePositive = asyncHandler(
  async (req: Request, res: Response) => {
    const submissionId = Number(req.params.id);
    const submission = await submissionService.markAnomalyFalsePositive(
      submissionId,
      req.user!.organizationId,
      req.user!.id,
      req.body.notes
    );
    res.json(submission);
  }
);

// Updates anomaly status on a submission
export const updateAnomalyStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const submissionId = Number(req.params.id);
    const submission = await submissionService.updateAnomalyStatus(
      submissionId,
      req.user!.organizationId,
      req.body.status,
      req.user!.id,
      req.body.notes
    );
    res.json(submission);
  }
);
