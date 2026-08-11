import { Role } from '@prisma/client';
import * as userRepo from '../repositories/userRepository';
import * as orgRepo from '../repositories/organizationRepository';
import * as invitationRepo from '../repositories/invitationRepository';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken } from '../utils/jwt';
import { randomBytes } from 'crypto';
import { sendReminderEmail } from '../utils/email';
import { config } from '../config/env';
import { OAuth2Client } from 'google-auth-library';
import { setNextDocumentNumber } from './sequenceService';

const sanitizeUser = (user: any) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  organizationId: user.organizationId,
  name: user.name ?? null,
  jobTitle: user.jobTitle ?? null,
  organization: user.organization?.name ?? user.organization ?? null,
  organizationProfile: user.organization ? {
    name: user.organization.name,
    taxpayerNumber: user.organization.taxpayerNumber ?? null,
    registrationNumber: user.organization.registrationNumber ?? null,
    address: user.organization.address ?? null,
    city: user.organization.city ?? null,
    district: user.organization.district ?? null,
    province: user.organization.province ?? null,
    postalCode: user.organization.postalCode ?? null,
    country: user.organization.country ?? 'Nepal',
    phone: user.organization.phone ?? null,
    email: user.organization.email ?? null,
    invoiceFooter: user.organization.invoiceFooter ?? null,
    resetSalesInvoiceSequenceEachFiscalYear: user.organization.resetSalesInvoiceSequenceEachFiscalYear ?? true,
    nextSalesInvoiceNumber: user.organization.nextSalesInvoiceNumber ?? 1,
  } : null,
  timezone: user.timezone ?? null,
  avatar: user.avatar ?? null,
  notificationPreferences: user.notificationPreferences ?? null,
  createdAt: user.createdAt
});

const googleOAuthClient = new OAuth2Client(
  config.googleClientId,
  config.googleClientSecret,
  config.googleAuthRedirectUri,
);

const getGoogleAuthClient = () => {
  if (!config.googleClientId || !config.googleClientSecret || !config.googleAuthRedirectUri) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_AUTH_REDIRECT_URI.');
  }
  return googleOAuthClient;
};

// Generates Google OAuth URL for user login
export const getGoogleAuthUrl = () => {
  const oauthClient = getGoogleAuthClient();
  return oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
  });
};

const loginOrCreateGoogleUser = async (payload: {
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}) => {
  const email = payload.email;
  if (!email) {
    throw new BadRequestError('GOOGLE_EMAIL_REQUIRED', 'Google account email is required');
  }
  if (!payload.email_verified) {
    throw new BadRequestError('GOOGLE_EMAIL_UNVERIFIED', 'Google account email must be verified');
  }

  let user = await userRepo.findByEmail(email);
  if (!user) {
    const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
    const organization = await orgRepo.create({
      name: payload.name
        ? `${payload.name}'s organization`
        : `Organization for ${email}`,
    });

    user = await userRepo.create({
      email,
      passwordHash,
      role: Role.ADMIN,
      organizationId: organization.id,
      name: payload.name ?? null,
      avatar: payload.picture ?? null,
    });
  } else {
    const updates: Record<string, any> = {};
    if (!user.name && payload.name) updates.name = payload.name;
    if (!user.avatar && payload.picture) updates.avatar = payload.picture;
    if (Object.keys(updates).length > 0) {
      user = await userRepo.updateById(user.id, updates);
    }
  }

  const refreshed = await userRepo.findById(user.id);
  if (refreshed) {
    user = refreshed;
  }

  const token = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  });

  return { token, user: sanitizeUser(user) };
};

// Handles Google OAuth callback and logs in user
export const handleGoogleCallback = async (code: string) => {
  const oauthClient = getGoogleAuthClient();
  const { tokens } = await oauthClient.getToken(code);
  if (!tokens.id_token) {
    throw new BadRequestError('GOOGLE_TOKEN_ERROR', 'Google ID token is missing');
  }

  const ticket = await oauthClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload) {
    throw new BadRequestError('GOOGLE_TOKEN_ERROR', 'Google token verification failed');
  }

  return loginOrCreateGoogleUser({
    email: payload.email ?? '',
    email_verified: payload.email_verified,
    name: payload.name ?? undefined,
    picture: payload.picture ?? undefined,
  });
};

// Registers a new user account
export const register = async (input: { 
  email: string; 
  password: string;
  name?: string;
  jobTitle?: string;
  organizationId?: number;
  organizationName?: string;
  invitationToken?: string;
}) => {
  const existing = await userRepo.findByEmail(input.email);
  if (existing) {
    throw new BadRequestError('EMAIL_TAKEN', 'Email already registered');
  }

  let organizationId = input.organizationId;
  let role: Role;

  if (input.invitationToken) {
    const invitation = await invitationRepo.findByToken(input.invitationToken);
    if (!invitation) {
      throw new BadRequestError('INVALID_INVITATION', 'Invalid invitation token');
    }
    if (invitation.email !== input.email) {
      throw new BadRequestError('EMAIL_MISMATCH', 'Invitation email does not match provided email');
    }
    if (input.organizationId && invitation.organizationId !== input.organizationId) {
      throw new BadRequestError('ORGANIZATION_MISMATCH', 'Invitation is for a different organization');
    }
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new BadRequestError('INVITATION_EXPIRED', 'Invitation token has expired');
    }
    if (invitation.acceptedAt) {
      throw new BadRequestError('INVITATION_USED', 'Invitation has already been used');
    }
    organizationId = invitation.organizationId;
    role = invitation.role;
    await invitationRepo.acceptInvitation(invitation.id, { acceptedAt: new Date() });
  } else {
    if (organizationId) {
      throw new BadRequestError(
        'INVITATION_REQUIRED',
        'Joining an existing organization requires an invitation',
      );
    }
    if (!input.organizationName) {
      throw new BadRequestError('ORGANIZATION_REQUIRED', 'Organization name is required');
    }
    const existingOrganization = await orgRepo.findByName(input.organizationName);
    if (existingOrganization) {
      throw new BadRequestError(
        'ORGANIZATION_NAME_TAKEN',
        'That organization already exists; ask an administrator for an invitation',
      );
    }
    const org = await orgRepo.create({ name: input.organizationName });
    organizationId = org.id;
    role = Role.ADMIN;
  }

  if (!organizationId) {
    throw new BadRequestError('ORGANIZATION_REQUIRED', 'Organization is required');
  }

  const organization = await orgRepo.findById(organizationId);
  if (!organization) {
    throw new NotFoundError('ORGANIZATION_NOT_FOUND', 'Organization not found');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await userRepo.create({
    email: input.email,
    passwordHash,
    role,
    organizationId: organizationId!,
    name: input.name ?? null,
    jobTitle: input.jobTitle ?? null
  });
  return sanitizeUser(user);
};

// Authenticates user with email and password
export const login = async (input: { email: string; password: string }) => {
  const user = await userRepo.findByEmail(input.email);
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }
  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid credentials');
  }
  const token = signAccessToken({ sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId });
  return { token, user: sanitizeUser(user) };
};

// Fetches the currently authenticated user
export const getCurrentUser = async (id: number) => {
  const numericId = typeof id === 'string' ? Number(id) : id;
  const user = await userRepo.findById(numericId as number);
  if (!user) {
    throw new NotFoundError('USER_NOT_FOUND', 'User not found');
  }
  return sanitizeUser(user);
};

// Updates the current user's profile
export const updateCurrentUser = async (
  id: number,
  data: Partial<{
    name: string | null;
    jobTitle: string | null;
    organization: string | null;
    taxpayerNumber?: string | null;
    registrationNumber?: string | null;
    address?: string | null;
    city?: string | null;
    district?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    invoiceFooter?: string | null;
    resetSalesInvoiceSequenceEachFiscalYear?: boolean;
    nextSalesInvoiceNumber?: number;
    timezone: string | null;
    avatar: string | null;
    notificationPreferences: Record<string, any> | null;
  }>
) => {
  const { organization, taxpayerNumber, registrationNumber, address, city, district, province, postalCode, country, phone, email, invoiceFooter, resetSalesInvoiceSequenceEachFiscalYear, nextSalesInvoiceNumber, ...userUpdates } = data as Partial<{
    name: string | null;
    jobTitle: string | null;
    organization: string | null;
    taxpayerNumber?: string | null;
    registrationNumber?: string | null;
    address?: string | null;
    city?: string | null;
    district?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    invoiceFooter?: string | null;
    resetSalesInvoiceSequenceEachFiscalYear?: boolean;
    nextSalesInvoiceNumber?: number;
    timezone: string | null;
    avatar: string | null;
    notificationPreferences: Record<string, any> | null;
  }>;

  const user = await userRepo.updateById(id, userUpdates);

  const hasOrganizationUpdates = [
    organization, taxpayerNumber, registrationNumber, address, city, district,
    province, postalCode, country, phone, email, invoiceFooter,
    resetSalesInvoiceSequenceEachFiscalYear,
    nextSalesInvoiceNumber,
  ].some((value) => value !== undefined);

  if (hasOrganizationUpdates) {
    await orgRepo.updateById(user.organizationId, {
      name: organization?.trim() || 'Organization',
      taxpayerNumber, registrationNumber, address, city, district, province,
      postalCode, country, phone, email, invoiceFooter,
      resetSalesInvoiceSequenceEachFiscalYear,
      nextSalesInvoiceNumber,
    });
    if (nextSalesInvoiceNumber !== undefined) {
      const latestOrganization = await orgRepo.findById(user.organizationId);
      if (latestOrganization) {
        await setNextDocumentNumber('sales_invoice', latestOrganization.nextSalesInvoiceNumber, {
          resetByFiscalYear: latestOrganization.resetSalesInvoiceSequenceEachFiscalYear,
        });
      }
    }
  }

  const refreshed = await userRepo.findById(id);
  if (!refreshed) {
    throw new NotFoundError('USER_NOT_FOUND', 'User not found');
  }
  return sanitizeUser(refreshed);
};

// Changes the user's password after verifying current
export const changePassword = async (id: number, currentPassword: string, newPassword: string) => {
  const user = await userRepo.findById(id as number);
  if (!user) {
    throw new NotFoundError('USER_NOT_FOUND', 'User not found');
  }
  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Current password is incorrect');
  }
  const newHash = await hashPassword(newPassword);
  await userRepo.updatePasswordById(id as number, newHash);
  return true;
};

// Creates and sends an invitation to join organization
export const createInvitation = async (input: {
  email: string;
  organizationId: number;
  invitedByUserId: number;
  role: Role;
}) => {
  const existingUser = await userRepo.findByEmail(input.email);
  if (existingUser) {
    throw new BadRequestError('EMAIL_REGISTERED', 'User with this email already exists');
  }

  const existingInvitation = await invitationRepo.findByEmailAndOrg(input.email, input.organizationId);
  if (existingInvitation && !existingInvitation.acceptedAt) {
    throw new BadRequestError('INVITATION_EXISTS', 'Invitation already sent to this email');
  }

  const organization = await orgRepo.findById(input.organizationId);
  if (!organization) {
    throw new NotFoundError('ORGANIZATION_NOT_FOUND', 'Organization not found');
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await invitationRepo.create({
    email: input.email,
    organizationId: input.organizationId,
    invitedByUserId: input.invitedByUserId,
    role: input.role,
    token,
    expiresAt
  });

  const inviteLink = `${config.appUrl}/#/register?token=${token}&org=${organization.id}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You're invited to join ${organization.name}</h2>
      <p>You have been invited by an administrator to join <strong>${organization.name}</strong> as a <strong>${input.role}</strong>.</p>
      <p>Click the button below to create your account:</p>
      <div style="margin: 30px 0;">
        <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
      </div>
      <p>Or copy and paste this link: <br/><a href="${inviteLink}" style="color: #2563eb;">${inviteLink}</a></p>
      <p style="color: #64748b; font-size: 14px; margin-top: 30px;">This invitation expires in 7 days.</p>
    </div>
  `;

  await sendReminderEmail({
    to: input.email,
    subject: `You're invited to join ${organization.name}`,
    text: `You have been invited to join ${organization.name}. Click here to accept: ${inviteLink}`,
    html
  });

  return invitation;
};

// Lists all invitations for an organization
export const getOrganizationInvitations = async (organizationId: number) => {
  return invitationRepo.findByOrganization(organizationId);
};

// Revokes a pending invitation
export const revokeInvitation = async (invitationId: number, organizationId: number) => {
  const invitation = await invitationRepo.findById(invitationId);
  if (!invitation) {
    throw new NotFoundError('INVITATION_NOT_FOUND', 'Invitation not found');
  }
  if (invitation.organizationId !== organizationId) {
    throw new UnauthorizedError('Not authorized to revoke this invitation');
  }
  if (invitation.acceptedAt) {
    throw new BadRequestError('INVITATION_ACCEPTED', 'Cannot revoke accepted invitation');
  }
  return invitationRepo.deleteById(invitationId);
};

// Validates an invitation token
export const validateInvitation = async (token: string, organizationId: number) => {
  const invitation = await invitationRepo.findByToken(token);
  if (!invitation) {
    throw new NotFoundError('INVITATION_NOT_FOUND', 'Invalid invitation token');
  }
  if (invitation.organizationId !== organizationId) {
    throw new BadRequestError('ORGANIZATION_MISMATCH', 'Invitation is for a different organization');
  }
  if (invitation.acceptedAt) {
    throw new BadRequestError('INVITATION_USED', 'Invitation has already been used');
  }
  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    throw new BadRequestError('INVITATION_EXPIRED', 'Invitation token has expired');
  }
  const organization = await orgRepo.findById(organizationId);
  return {
    email: invitation.email,
    role: invitation.role,
    organizationName: organization?.name ?? 'Unknown Organization'
  };
};

// Lists all users in an organization
export const listOrganizationUsers = async (organizationId: number) => {
  const users = await orgRepo.getUsers(organizationId);
  return users.map((user: any) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name ?? null,
    jobTitle: user.jobTitle ?? null,
    createdAt: user.createdAt,
  }));
};

// Updates a user's role within the organization
export const updateUserRole = async (
  userId: number,
  organizationId: number,
  role: Role
) => {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new NotFoundError('USER_NOT_FOUND', 'User not found');
  }
  if (user.organizationId !== organizationId) {
    throw new UnauthorizedError('Not authorized to modify this user');
  }

  if (user.role === Role.ADMIN && role !== Role.ADMIN) {
    const organizationUsers = await orgRepo.getUsers(organizationId);
    const adminCount = organizationUsers.filter((candidate) => candidate.role === Role.ADMIN).length;
    if (adminCount <= 1) {
      throw new BadRequestError('LAST_ADMIN_REQUIRED', 'The organization must retain at least one administrator');
    }
  }

  return userRepo.updateRole(userId, role);
};

// Removes a user from the organization
export const removeUser = async (userId: number, organizationId: number, requestingUserId: number) => {
  if (userId === requestingUserId) {
    throw new BadRequestError('CANNOT_REMOVE_SELF', 'You cannot remove your own account');
  }
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new NotFoundError('USER_NOT_FOUND', 'User not found');
  }
  if (user.organizationId !== organizationId) {
    throw new UnauthorizedError('Not authorized to remove this user');
  }
  if (user.role === Role.ADMIN) {
    throw new BadRequestError('CANNOT_REMOVE_ADMIN', 'Cannot remove an admin user');
  }
  return userRepo.deleteById(userId);
};
