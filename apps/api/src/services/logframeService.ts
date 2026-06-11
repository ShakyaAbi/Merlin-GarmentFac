import { LogframeNode, NodeType } from '@prisma/client';
import * as logframeRepo from '../repositories/logframeRepository';
import * as projectRepo from '../repositories/projectRepository';
import { BadRequestError, NotFoundError } from '../utils/errors';

const allowedChildren: Record<NodeType, NodeType[]> = {
  GOAL: [NodeType.OUTCOME],
  OUTCOME: [NodeType.OUTPUT],
  OUTPUT: [NodeType.ACTIVITY],
  ACTIVITY: []
};

const ensureProject = async (projectId: number, organizationId: number) => {
  const project = await projectRepo.getProjectById(projectId, organizationId);
  if (!project) throw new NotFoundError('PROJECT_NOT_FOUND', 'Project not found');
  return project;
};

const validateParent = (parent: LogframeNode | null, childType: NodeType) => {
  if (!parent) {
    if (childType !== NodeType.GOAL) {
      throw new BadRequestError('INVALID_HIERARCHY', 'Root nodes must be GOAL');
    }
    return;
  }
  const allowed = allowedChildren[parent.type] || [];
  if (!allowed.includes(childType)) {
    throw new BadRequestError('INVALID_HIERARCHY', `Cannot attach ${childType} under ${parent.type}`);
  }
};

const buildTree = (nodes: LogframeNode[]) => {
  const map = new Map<number, LogframeNode & { children: any[] }>();
  const roots: Array<LogframeNode & { children: any[] }> = [];

  nodes.forEach((node) => map.set(node.id, { ...node, children: [] }));
  nodes.forEach((node) => {
    const current = map.get(node.id)!;
    if (node.parentId) {
      const parent = map.get(node.parentId);
      if (parent) parent.children.push(current);
    } else {
      roots.push(current);
    }
  });

  return roots;
};

// Creates a logframe node
export const createNode = async (
  projectId: number,
  organizationId: number,
  data: { type: NodeType; title: string; description?: string; assumptions?: string; risks?: string; parentId?: number | null; sortOrder?: number }
) => {
  await ensureProject(projectId, organizationId);
  let parent: LogframeNode | null = null;

  if (data.parentId) {
    parent = await logframeRepo.getById(data.parentId);
    if (!parent || parent.projectId !== projectId) {
      throw new BadRequestError('INVALID_PARENT', 'Parent must exist in the same project');
    }
  }

  validateParent(parent, data.type);

  return logframeRepo.createNode({
    projectId,
    type: data.type,
    title: data.title,
    description: data.description ?? null,
    assumptions: data.assumptions ?? null,
    risks: data.risks ?? null,
    parentId: data.parentId ?? null,
    sortOrder: data.sortOrder ?? 0
  });
};

// Builds the logframe tree
export const getTree = async (projectId: number, organizationId: number) => {
  await ensureProject(projectId, organizationId);
  const nodes = await logframeRepo.getByProject(projectId);
  return buildTree(nodes);
};

// Updates a logframe node
export const updateNode = async (
  id: number,
  data: Partial<{ title: string; description: string; assumptions: string; risks: string; parentId: number | null; sortOrder: number; type: NodeType }>
) => {
  const existing = await logframeRepo.getById(id);
  if (!existing) throw new NotFoundError('NODE_NOT_FOUND', 'Logframe node not found');

  let parent: LogframeNode | null = null;
  if (data.parentId !== undefined) {
    if (data.parentId === null) {
      parent = null;
    } else {
      parent = await logframeRepo.getById(data.parentId);
      if (!parent || parent.projectId !== existing.projectId) {
        throw new BadRequestError('INVALID_PARENT', 'Parent must exist in the same project');
      }
    }
  } else if (existing.parentId) {
    parent = await logframeRepo.getById(existing.parentId);
  }

  const nextType = data.type ?? existing.type;
  validateParent(parent, nextType);

  return logframeRepo.updateNode(id, {
    title: data.title,
    description: data.description,
    assumptions: data.assumptions,
    risks: data.risks,
    parentId: data.parentId === undefined ? existing.parentId : data.parentId,
    sortOrder: data.sortOrder,
    type: data.type
  });
};

// Deletes a logframe node
export const deleteNode = async (id: number) => {
  const existing = await logframeRepo.getById(id);
  if (!existing) throw new NotFoundError('NODE_NOT_FOUND', 'Logframe node not found');

  const children = await logframeRepo.getChildrenCount(id);
  if (children > 0) {
    throw new BadRequestError('NODE_HAS_CHILDREN', 'Remove child nodes before deleting this node');
  }

  await logframeRepo.deleteNode(id);
};

// Cascade delete: delete node and all descendants and their indicators/submissions
// Deletes a node and its descendants
export const deleteNodeCascade = async (id: number) => {
  const existing = await logframeRepo.getById(id);
  if (!existing) throw new NotFoundError('NODE_NOT_FOUND', 'Logframe node not found');

  // Collect all descendant node ids using a queue
  const nodes = await logframeRepo.getByProject(existing.projectId);
  const idSet = new Set<number>();
  const map = new Map<number, { parentId?: number | null }>();
  nodes.forEach((n: any) => map.set(n.id, { parentId: n.parentId }));

  const queue = [existing.id];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    idSet.add(cur);
    for (const [nid, meta] of map.entries()) {
      if (meta.parentId === cur && !idSet.has(nid)) queue.push(nid);
    }
  }

  const ids = Array.from(idSet);

  // Delete indicators that belong to these nodes (this will cascade to submissions via FK onDelete: Cascade)
  await logframeRepo.deleteNodes(ids);

  // Note: indicators have onDelete: Cascade in schema so deleting nodes will delete indicators.
  return;
};
