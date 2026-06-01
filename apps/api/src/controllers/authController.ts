import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { asyncHandler } from '../utils/asyncHandler';
import { config } from '../config/env';

// Registers a new user account
export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register(req.body);
  res.status(201).json(user);
});

// Authenticates user and returns token
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.json(result);
});

const redirectToLoginWithError = (res: Response, error: string) => {
  const redirectUrl = `${config.appUrl}/#/?error=${encodeURIComponent(error)}`;
  return res.redirect(redirectUrl);
};

// Redirects user to Google OAuth consent screen
export const googleAuthRedirect = asyncHandler(async (_req: Request, res: Response) => {
  try {
    const authUrl = authService.getGoogleAuthUrl();
    res.redirect(authUrl);
  } catch (error: any) {
    const message = error?.message || 'Google sign-in is not configured';
    return redirectToLoginWithError(res, message);
  }
});

// Handles Google OAuth callback and logs user in
export const googleAuthCallback = asyncHandler(async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  if (!code) {
    return redirectToLoginWithError(res, 'Missing Google authorization code');
  }

  try {
    const result = await authService.handleGoogleCallback(code);
    const redirectUrl = `${config.appUrl}/#/google-callback?token=${encodeURIComponent(result.token)}`;
    res.redirect(redirectUrl);
  } catch (error: any) {
    const message = error?.message || 'Google sign-in failed';
    return redirectToLoginWithError(res, message);
  }
});

// Returns the authenticated user's profile
export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.id);
  res.json(user);
});

// Updates the authenticated user's profile
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateCurrentUser(req.user!.id, req.body);
  res.json(user);
});

// Creates an invitation for a new organization member
export const createInvitation = asyncHandler(async (req: Request, res: Response) => {
  const invitation = await authService.createInvitation({
    email: req.body.email,
    organizationId: req.user!.organizationId,
    invitedByUserId: req.user!.id,
    role: req.body.role
  });
  res.status(201).json(invitation);
});

// Lists all pending invitations for the organization
export const listInvitations = asyncHandler(async (req: Request, res: Response) => {
  const invitations = await authService.getOrganizationInvitations(req.user!.organizationId);
  res.json(invitations);
});

// Revokes a pending invitation by ID
export const revokeInvitation = asyncHandler(async (req: Request, res: Response) => {
  const invitationId = parseInt(req.params.id);
  await authService.revokeInvitation(invitationId, req.user!.organizationId);
  res.status(204).send();
});

// Validates an invitation token for signup
export const validateInvitation = asyncHandler(async (req: Request, res: Response) => {
  const token = req.query.token as string;
  const orgId = parseInt(req.query.orgId as string);
  const result = await authService.validateInvitation(token, orgId);
  res.json(result);
});

// Changes the authenticated user's password
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  res.status(204).send();
});
