import { Role } from "@prisma/client";
import { prisma } from "../prisma";

// Finds a user by email
export const findByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

// Finds a user by ID
export const findById = (id: number) =>
  prisma.user.findUnique({ where: { id } });

// Creates a new user account
export const create = (data: {
  email: string;
  passwordHash: string;
  role: Role;
  organizationId: number;
  name?: string | null;
  jobTitle?: string | null;
  avatar?: string | null;
}) => prisma.user.create({ data });

// Updates a user's profile fields
export const updateById = (
  id: number,
  data: Partial<{
    name: string | null;
    jobTitle: string | null;
    timezone: string | null;
    avatar: string | null;
    notificationPreferences: Record<string, any> | null;
  }>
) =>
  prisma.user.update({
    where: { id },
    data: {
      ...data,
      notificationPreferences:
        data.notificationPreferences !== undefined
          ? (data.notificationPreferences as any)
          : undefined,
    },
  });

// Updates a user's password hash
export const updatePasswordById = (id: number, passwordHash: string) =>
  prisma.user.update({ where: { id }, data: { passwordHash } });

// Updates a user's role
export const updateRole = (id: number, role: Role) =>
  prisma.user.update({ where: { id }, data: { role } });

// Deletes a user by ID
export const deleteById = (id: number) =>
  prisma.user.delete({ where: { id } });
