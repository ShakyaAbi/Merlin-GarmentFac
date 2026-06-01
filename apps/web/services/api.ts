import { authApi, Invitation, OrganizationUser } from "./authApi";
import { projectApi } from "./projectApi";
import { indicatorApi, submissionApi } from "./indicatorApi";
import { importApi, exportApi } from "./importExportApi";
import { notificationApi } from "./notificationApi";
import { getToken, setToken, request } from "./apiClient";

export type { Invitation, OrganizationUser };

/**
 * @deprecated Use individual API modules (authApi, projectApi, etc.) instead.
 * This object is maintained for backward compatibility during refactoring.
 */
export const api = {
  ...authApi,
  ...projectApi,
  ...indicatorApi,
  ...submissionApi,
  ...importApi,
  ...exportApi,
  ...notificationApi,
  getInventoryAlerts: async () => request('/inventory/alerts'),
  
  // Generic methods
  get: async <T = any>(path: string): Promise<T> => request<T>(path),
  post: async <T = any>(path: string, body?: any): Promise<T> =>
    request<T>(path, { method: "POST", body }),
  put: async <T = any>(path: string, body?: any): Promise<T> =>
    request<T>(path, { method: "PUT", body }),
  delete: async <T = any>(path: string): Promise<T> =>
    request<T>(path, { method: "DELETE" }),
};

export const authStorage = { getToken, setToken };
