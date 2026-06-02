import { ProjectStatus } from '@prisma/client';
import { prisma } from '../prisma';

// Creates a new project
export const createProject = (data: {
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: Date | null;
  endDate: Date | null;
  sectors: string[];
  location: string | null;
  donor: string | null;
  budgetAmount: number | null;
  budgetSpent: number | null;
  budgetCurrency: string | null;
  organizationId: number;
}) => prisma.project.create({ data });

// Gets all projects for an organization
export const getProjects = (organizationId: number) => prisma.project.findMany({ 
  where: { organizationId },
  include: {
    _count: {
      select: { indicators: true }
    }
  },
  orderBy: { createdAt: 'desc' } 
});

// Gets a project by ID within an organization
export const getProjectById = (id: number, organizationId: number) => prisma.project.findFirst({ 
  where: { id, organizationId }
});

// Updates a project's fields
export const updateProject = (
  id: number,
  organizationId: number,
  data: Partial<{
    name: string;
    description: string | null;
    status: ProjectStatus;
    startDate: Date | null;
    endDate: Date | null;
    sectors: string[];
    location: string | null;
    donor: string | null;
    budgetAmount: number | null;
    budgetSpent: number | null;
    budgetCurrency: string | null;
  }>
) => prisma.project.update({ where: { id, organizationId }, data });

// Deletes a project by ID within an organization
export const deleteProject = (id: number, organizationId: number) => prisma.project.delete({ where: { id, organizationId } });
