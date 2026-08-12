import { authApi, Invitation, OrganizationUser } from "./authApi";
import { projectApi } from "./projectApi";
import { indicatorApi, submissionApi } from "./indicatorApi";
import { importApi, exportApi } from "./importExportApi";
import { notificationApi } from "./notificationApi";
import { getToken, setToken, request } from "./apiClient";
import { rawMaterialApi } from "./rawMaterialApi";
import { salesInvoiceApi } from "./salesInvoiceApi";

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
  ...rawMaterialApi,
  ...salesInvoiceApi,
  getInventoryAlerts: async () => request('/inventory/alerts'),
  getInventoryAlertsSummary: async () => request('/inventory/alerts/summary'),
  acknowledgeInventoryAlert: async (id: string) =>
    request(`/inventory/alerts/${id}/ack`, { method: "POST" }),
  
  // Generic methods
  get: async <T = any>(path: string): Promise<T> => request<T>(path),
  post: async <T = any>(path: string, body?: any): Promise<T> =>
    request<T>(path, { method: "POST", body }),
  patch: async <T = any>(path: string, body?: any): Promise<T> =>
    request<T>(path, { method: "PATCH", body }),
  put: async <T = any>(path: string, body?: any): Promise<T> =>
    request<T>(path, { method: "PUT", body }),
  delete: async <T = any>(path: string): Promise<T> =>
    request<T>(path, { method: "DELETE" }),
};

export const authStorage = { getToken, setToken };
