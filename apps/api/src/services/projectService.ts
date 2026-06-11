import { NodeType, ProjectStatus } from '@prisma/client';
import * as projectRepo from '../repositories/projectRepository';
import { NotFoundError } from '../utils/errors';
import { prisma } from '../prisma';

const parseDate = (value?: string | null) => (value ? new Date(value) : null);
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const diffDays = (start: Date, end: Date) =>
  Math.max(0, Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY));

// Creates a new project
export const createProject = async (organizationId: number, data: {
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  sectors?: string[];
  location?: string;
  donor?: string;
  budgetAmount?: number;
  budgetSpent?: number;
  budgetCurrency?: string;
}) => {
  return projectRepo.createProject({
    name: data.name,
    description: data.description ?? null,
    status: data.status ?? ProjectStatus.DRAFT,
    startDate: parseDate(data.startDate),
    endDate: parseDate(data.endDate),
    sectors: data.sectors ?? [],
    location: data.location ?? null,
    donor: data.donor ?? null,
    budgetAmount: data.budgetAmount ?? null,
    budgetSpent: data.budgetSpent ?? null,
    budgetCurrency: data.budgetCurrency ?? null,
    organizationId
  });
};

// Lists projects for an organization
export const listProjects = async (organizationId: number) => projectRepo.getProjects(organizationId);

// Fetches one project
export const getProject = async (id: number, organizationId: number) => {
  const project = await projectRepo.getProjectById(id, organizationId);
  if (!project) {
    throw new NotFoundError('PROJECT_NOT_FOUND', 'Project not found');
  }
  return project;
};

// Updates a project
export const updateProject = async (
  id: number,
  organizationId: number,
  data: Partial<{
    name: string;
    description: string;
    status: ProjectStatus;
    startDate: string;
    endDate: string;
    sectors: string[];
    location: string;
    donor: string;
    budgetAmount: number;
    budgetSpent: number;
    budgetCurrency: string;
  }>
) => {
  await getProject(id, organizationId);
  return projectRepo.updateProject(id, organizationId, {
    name: data.name,
    description: data.description,
    status: data.status,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
    sectors: data.sectors,
    location: data.location,
    donor: data.donor,
    budgetAmount: data.budgetAmount,
    budgetSpent: data.budgetSpent,
    budgetCurrency: data.budgetCurrency
  });
};

// Deletes a project
export const deleteProject = async (id: number, organizationId: number) => {
  await getProject(id, organizationId);
  return projectRepo.deleteProject(id, organizationId);
};

// Builds project statistics
export const getProjectStats = async (id: number, organizationId: number) => {
  const project = await getProject(id, organizationId);
  const now = new Date();

  const daysTotal =
    project.startDate && project.endDate ? diffDays(project.startDate, project.endDate) : 0;
  const endCap = project.endDate && project.endDate < now ? project.endDate : now;
  const daysElapsed =
    project.startDate ? diffDays(project.startDate, endCap) : 0;

  const indicators = await prisma.indicator.findMany({
    where: { projectId: project.id, project: { organizationId } },
    select: {
      id: true,
      submissions: {
        select: { id: true },
        take: 1
      }
    }
  });

  const indicatorsTotal = indicators.length;
  const indicatorsReporting = indicators.filter(
    (ind) => ind.submissions.length > 0
  ).length;

  const submissionsCount = await prisma.submission.count({
    where: { indicator: { projectId: id, project: { organizationId } } }
  });

  return {
    budgetTotal: project.budgetAmount ?? 0,
    budgetSpent: (project as any).budgetSpent ?? 0,
    daysTotal,
    daysElapsed,
    indicatorsTotal,
    indicatorsReporting,
    submissionsCount
  };
};

// Builds project alerts
export const getProjectAlerts = async (id: number, organizationId: number) => {
  const project = await getProject(id, organizationId);
  const now = new Date();

  // Get all indicators with their last 10 submissions to check for alerts
  const indicators = await prisma.indicator.findMany({
    where: { projectId: id, project: { organizationId } },
    include: {
      submissions: {
        where: { deletedAt: null },
        orderBy: { reportedAt: 'desc' },
        take: 10
      }
    }
  });

  const alerts: any[] = [];

  for (const indicator of indicators) {
    // 1. Check for recent anomalies (within last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * MS_PER_DAY);
    const recentAnomalies = indicator.submissions.filter(
      (s) => s.isAnomaly && s.reportedAt >= thirtyDaysAgo
    );

    for (const anomaly of recentAnomalies) {
      alerts.push({
        id: `anomaly-${anomaly.id}`,
        type: 'anomaly',
        indicatorId: indicator.id,
        indicatorName: indicator.name,
        title: `Anomaly in ${indicator.name}`,
        message: anomaly.anomalyReason || `Value spike detected on ${anomaly.reportedAt.toISOString().split('T')[0]}.`,
        date: anomaly.reportedAt.toISOString(),
        severity: 'danger'
      });
    }

    // 2. Check for overdue reporting
    // Try to get frequency from validationConfig or indicator.frequency (if it were to exist in DB)
    const freq = (indicator.validationConfig as any)?.reportingFrequency || 'WEEKLY';
    const lastSubmission = indicator.submissions[0];
    
    let expectedDays = 7;
    if (freq === 'DAILY') expectedDays = 1;
    if (freq === 'MONTHLY') expectedDays = 30;
    if (freq === 'QUARTERLY') expectedDays = 90;

    const threshold = expectedDays * 1.5;
    
    // Reference date is either the last report or the project start date
    const refDate = lastSubmission ? lastSubmission.reportedAt : project.startDate;
    
    if (refDate) {
      const daysSince = diffDays(refDate, now);
      if (daysSince > threshold) {
        alerts.push({
          id: `overdue-${indicator.id}`,
          type: 'overdue',
          indicatorId: indicator.id,
          indicatorName: indicator.name,
          title: `${freq.charAt(0) + freq.slice(1).toLowerCase()} Report Overdue`,
          message: lastSubmission 
            ? `${indicator.name} was last reported ${daysSince} days ago.` 
            : `${indicator.name} has no data yet. Expected every ${expectedDays} days.`,
          date: refDate.toISOString(),
          severity: 'warning'
        });
      }
    }
  }

  // Sort by date descending
  return alerts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Lists recent project activities
export const getProjectActivities = async (id: number, organizationId: number) => {
  await getProject(id, organizationId);
  return prisma.submission.findMany({
    where: { indicator: { projectId: id, project: { organizationId } } },
    include: {
      indicator: true,
      createdByUser: true
    },
    orderBy: { createdAt: 'desc' },
    take: 30
  });
};
