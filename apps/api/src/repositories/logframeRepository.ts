import { NodeType } from '@prisma/client';
import { prisma } from '../prisma';

// Creates a new logframe node
export const createNode = (data: {
  projectId: number;
  type: NodeType;
  title: string;
  description: string | null;
  assumptions: string | null;
  risks: string | null;
  parentId: number | null;
  sortOrder: number;
}) => prisma.logframeNode.create({ data });

// Gets a logframe node by ID
export const getById = (id: number) => prisma.logframeNode.findUnique({ where: { id } });

// Gets all nodes for a project
export const getByProject = (projectId: number) =>
  prisma.logframeNode.findMany({ where: { projectId }, orderBy: { sortOrder: 'asc' } });

// Updates a logframe node
export const updateNode = (
  id: number,
  data: Partial<{
    title: string;
    description: string | null;
    assumptions: string | null;
    risks: string | null;
    parentId: number | null;
    sortOrder: number;
    type: NodeType;
  }>
) => prisma.logframeNode.update({ where: { id }, data });

// Deletes a logframe node by ID
export const deleteNode = (id: number) => prisma.logframeNode.delete({ where: { id } });

// Counts child nodes of a logframe node
export const getChildrenCount = (id: number) => prisma.logframeNode.count({ where: { parentId: id } });

// Deletes multiple logframe nodes by IDs
export const deleteNodes = (ids: number[]) => prisma.logframeNode.deleteMany({ where: { id: { in: ids } } });
