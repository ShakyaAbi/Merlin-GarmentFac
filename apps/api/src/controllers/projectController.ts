import { Request, Response } from 'express';
import { IndicatorDataType } from '@prisma/client';
import * as projectService from '../services/projectService';
import { asyncHandler } from '../utils/asyncHandler';
import { formatRelativeTime, initialsFromName } from '../utils/time';

const assessAnomaly = (dataType: IndicatorDataType, value: string, min?: number | null, max?: number | null) => {
  if (dataType === 'NUMBER') {
    const num = Number(value);
    if (!Number.isFinite(num)) return false;
    if (min !== null && min !== undefined && num < min) return true;
    if (max !== null && max !== undefined && num > max) return true;
    return false;
  }
  if (dataType === 'PERCENT') {
    const num = Number(value);
    if (!Number.isFinite(num)) return false;
    const lower = min ?? 0;
    const upper = max ?? 100;
    return num < lower || num > upper;
  }
  return false;
};

// Creates a new project
export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.createProject(req.user!.organizationId, req.body);
  res.status(201).json(project);
});

// Lists all projects in the organization
export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const projects = await projectService.listProjects(req.user!.organizationId);
  res.json(projects);
});

// Gets a single project by ID
export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.getProject(Number(req.params.id), req.user!.organizationId);
  res.json(project);
});

// Updates an existing project
export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.updateProject(Number(req.params.id), req.user!.organizationId, req.body);
  res.json(project);
});

// Deletes a project
export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.deleteProject(Number(req.params.id), req.user!.organizationId);
  res.json(project);
});

// Gets project-level statistics
export const getProjectStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await projectService.getProjectStats(Number(req.params.id), req.user!.organizationId);
  res.json(stats);
});

// Gets recent project activity feed
export const getProjectActivities = asyncHandler(async (req: Request, res: Response) => {
  const activities = await projectService.getProjectActivities(Number(req.params.id), req.user!.organizationId);
  const response = activities.map((submission) => {
    const userName = submission.createdByUser.name || submission.createdByUser.email;
    const isAnomaly = assessAnomaly(
      submission.indicator.dataType,
      submission.value,
      submission.indicator.minValue,
      submission.indicator.maxValue
    );
    return {
      id: `submission-${submission.id}`,
      user: userName,
      userInitials: initialsFromName(userName),
      action: 'submitted data for',
      item: submission.indicator.name,
      date: formatRelativeTime(submission.createdAt),
      type: isAnomaly ? 'warning' : 'success'
    };
  });
  res.json(response);
});

// Gets project alerts and anomalies
export const getProjectAlerts = asyncHandler(async (req: Request, res: Response) => {
  const alerts = await projectService.getProjectAlerts(Number(req.params.id), req.user!.organizationId);
  res.json(alerts);
});
