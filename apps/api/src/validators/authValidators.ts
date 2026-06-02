import { z } from 'zod';
import { Role } from '@prisma/client';

// Validates user registration request body
export const registerSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional(),
    jobTitle: z.string().optional(),
    organizationId: z.number().int().positive().optional(),
    organizationName: z.string().min(1).optional(),
    invitationToken: z.string().optional()
  }).refine(data => data.organizationId || data.organizationName || data.invitationToken, {
    message: "Either organizationId, organizationName, or invitationToken is required"
  })
};

// Validates invitation creation request body
export const createInvitationSchema = {
  body: z.object({
    email: z.string().email(),
    role: z.nativeEnum(Role).default(Role.DATA_ENTRY)
  })
};

// Validates login request body
export const loginSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })
};

// Validates profile update request body
export const updateMeSchema = {
  body: z.object({
    name: z.string().min(1).optional().nullable(),
    jobTitle: z.string().min(1).optional().nullable(),
    organization: z.string().min(1).optional().nullable(),
    timezone: z.string().min(1).optional().nullable(),
    avatar: z.string().url().optional().nullable(),
    notificationPreferences: z
      .object({
        emailAlerts: z.boolean(),
        browserPush: z.boolean(),
        weeklyDigest: z.boolean(),
        anomalyAlerts: z.boolean()
      })
      .optional()
      .nullable()
  })
};

// Validates password change request body
export const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8)
  })
};
