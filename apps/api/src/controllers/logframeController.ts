import { Request, Response } from 'express';
import * as logframeService from '../services/logframeService';
import { deleteNodeCascade } from '../services/logframeService';
import { asyncHandler } from '../utils/asyncHandler';

// Creates a new logframe tree node
export const createLogframeNode = asyncHandler(async (req: Request, res: Response) => {
  const projectId = Number(req.params.projectId);
  const organizationId = req.user!.organizationId;
  const node = await logframeService.createNode(projectId, organizationId, req.body);
  res.status(201).json(node);
});

// Gets the full logframe tree for a project
export const getLogframeTree = asyncHandler(async (req: Request, res: Response) => {
  const projectId = Number(req.params.projectId);
  const organizationId = req.user!.organizationId;
  const tree = await logframeService.getTree(projectId, organizationId);
  res.json(tree);
});

// Updates a logframe tree node
export const updateLogframeNode = asyncHandler(async (req: Request, res: Response) => {
  const node = await logframeService.updateNode(Number(req.params.id), req.body);
  res.json(node);
});

// Deletes a logframe tree node
export const deleteLogframeNode = asyncHandler(async (req: Request, res: Response) => {
  const cascade = req.query.cascade === 'true';
  if (cascade) {
    await deleteNodeCascade(Number(req.params.id));
    res.status(204).send();
    return;
  }

  await logframeService.deleteNode(Number(req.params.id));
  res.status(204).send();
});
