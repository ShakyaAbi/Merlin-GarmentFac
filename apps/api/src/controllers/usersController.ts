import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { asyncHandler } from '../utils/asyncHandler';

// Lists all users in the organization
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await authService.listOrganizationUsers(req.user!.organizationId);
  res.json(users);
});

// Updates a user's role in the organization
export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
  const { role } = req.body;
  const user = await authService.updateUserRole(userId, req.user!.organizationId, role);
  res.json(user);
});

// Removes a user from the organization
export const removeUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
  await authService.removeUser(userId, req.user!.organizationId);
  res.status(204).send();
});
