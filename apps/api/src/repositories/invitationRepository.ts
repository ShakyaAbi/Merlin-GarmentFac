import { Role, Prisma } from "@prisma/client";
import { prisma } from "../prisma";

// Finds an invitation by token
export const findByToken = (token: string) =>
  prisma.invitation.findUnique({ where: { token } });

// Finds an invitation by email and organization
export const findByEmailAndOrg = (email: string, organizationId: number) =>
  prisma.invitation.findUnique({ 
    where: { 
      email_organizationId: { email, organizationId } 
    } 
  });

// Finds pending invitations for an organization
export const findByOrganization = (organizationId: number) =>
  prisma.invitation.findMany({ 
    where: { organizationId, acceptedAt: null },
    include: { invitedBy: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: 'desc' }
  });

// Creates a new invitation
export const create = (data: {
  email: string;
  organizationId: number;
  invitedByUserId: number;
  role: Role;
  token: string;
  expiresAt: Date;
}) =>
  prisma.invitation.create({ data });

// Finds an invitation by ID
export const findById = (id: number) =>
  prisma.invitation.findUnique({ where: { id } });

// Deletes an invitation by ID
export const deleteById = (id: number) =>
  prisma.invitation.delete({ where: { id } });

// Marks an invitation as accepted
export const acceptInvitation = (id: number, data: { acceptedAt: Date }) =>
  prisma.invitation.update({ where: { id }, data });
