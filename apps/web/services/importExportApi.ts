import { request, getAuthHeader } from "./apiClient";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

export const importApi = {
  uploadImportCSV: async (
    indicatorId: string,
    file: File,
    templateId?: number,
  ): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    if (templateId) formData.append("templateId", String(templateId));

    const response = await fetch(`${API_BASE}/indicators/${indicatorId}/import`, {
      method: "POST",
      headers: getAuthHeader(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message =
        error?.error?.message ||
        error?.error ||
        error?.message ||
        "Upload failed";
      throw new Error(message);
    }

    return response.json();
  },
  executeImport: async (jobId: number, selectedRowNumbers?: number[]): Promise<void> =>
    request(`/import-jobs/${jobId}/process`, {
      method: "POST",
      body: selectedRowNumbers ? { selectedRowNumbers } : undefined,
    }),
  getImportJobStatus: async (jobId: number): Promise<any> =>
    request(`/import-jobs/${jobId}`),
  cancelImport: async (jobId: number): Promise<void> =>
    request(`/import-jobs/${jobId}/cancel`, { method: "POST" }),
  
  // Templates
  getImportTemplates: async (indicatorId: string): Promise<any[]> =>
    request(`/indicators/${indicatorId}/import-templates`),
  createImportTemplate: async (
    indicatorId: string,
    template: any,
  ): Promise<any> =>
    request(`/indicators/${indicatorId}/import-templates`, {
      method: "POST",
      body: template,
    }),
  updateImportTemplate: async (
    templateId: number,
    template: any,
  ): Promise<any> =>
    request(`/import-templates/${templateId}`, {
      method: "PUT",
      body: template,
    }),
  deleteImportTemplate: async (templateId: number): Promise<void> =>
    request(`/import-templates/${templateId}`, { method: "DELETE" }),
  cloneImportTemplate: async (templateId: number): Promise<any> =>
    request(`/import-templates/${templateId}/clone`, { method: "POST" }),
  downloadImportTemplateSample: async (indicatorId: string): Promise<Blob> => {
    const response = await fetch(
      `${API_BASE}/indicators/${indicatorId}/import-template-sample`,
      {
        headers: getAuthHeader(),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error?.error?.message || "Failed to download template");
    }

    return response.blob();
  },
};

export const exportApi = {
  exportIndicatorCSV: async (
    indicatorId: string,
    filters?: Record<string, any>,
  ): Promise<Blob> => {
    const templateId = filters?.templateId ? Number(filters.templateId) : undefined;
    const normalizedFilters = { ...(filters || {}) };
    delete (normalizedFilters as any).templateId;

    const response = await fetch(`${API_BASE}/indicators/${indicatorId}/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        templateId,
        filters: normalizedFilters,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Export failed");
    }

    return response.blob();
  },
};
