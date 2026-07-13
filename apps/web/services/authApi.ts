import { request, setToken } from "./apiClient";
import { CurrentUser } from "../types";

const mapCurrentUser = (user: any): CurrentUser => ({
  id: String(user.id),
  email: user.email ?? "",
  role: user.role ?? "",
  organizationId: user.organizationId ?? 0,
  createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
  name: user.name ?? null,
  jobTitle: user.jobTitle ?? null,
  organization: user.organization?.name ?? user.organization ?? null,
  organizationProfile: user.organizationProfile ?? null,
  avatar: user.avatar ?? null,
});

export interface Invitation {
  id: number;
  email: string;
  role: string;
  organizationId: number;
  invitedByUserId: number;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface OrganizationUser {
  id: number;
  email: string;
  role: string;
  name: string | null;
  jobTitle: string | null;
  createdAt: string;
}

export const authApi = {
  login: async (email: string, password: string) => {
    const result = await request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(result.token);
    return result;
  },
  me: async (): Promise<CurrentUser> => {
    const user = await request("/auth/me");
    return mapCurrentUser(user);
  },
  updateMe: async (body: {
    name?: string | null;
    jobTitle?: string | null;
    organization?: string | null;
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
    timezone?: string | null;
    avatar?: string | null;
    notificationPreferences?: Record<string, boolean> | null;
  }) => {
    const user = await request("/auth/me", {
      method: "PATCH",
      body,
    });
    return mapCurrentUser(user);
  },
  createInvitation: async (email: string, role: string) => {
    return request<Invitation>("/auth/invitations", {
      method: "POST",
      body: { email, role },
    });
  },
  listInvitations: async (): Promise<Invitation[]> => {
    return request("/auth/invitations");
  },
  revokeInvitation: async (id: number) => {
    return request(`/auth/invitations/${id}`, {
      method: "DELETE",
    });
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    return request(`/auth/me/password`, {
      method: "PATCH",
      body: { currentPassword, newPassword },
    });
  },
  listUsers: async (): Promise<OrganizationUser[]> => {
    return request("/users");
  },
  updateUserRole: async (userId: number, role: string) => {
    return request<OrganizationUser>(`/users/${userId}/role`, {
      method: "PATCH",
      body: { role },
    });
  },
  removeUser: async (userId: number) => {
    return request(`/users/${userId}`, {
      method: "DELETE",
    });
  },
};
