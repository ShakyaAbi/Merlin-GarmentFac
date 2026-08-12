import { request } from './apiClient'

export interface ArticleCategoryPayload {
  name: string
  description?: string
}

export const articleCategoryApi = {
  getCategories: () => request<any[]>('/inventory/article-categories'),
  createCategory: (data: ArticleCategoryPayload) =>
    request<any>('/inventory/article-categories', { method: 'POST', body: data }),

  deleteCategory: (id: string) =>
    request<void>(`/inventory/article-categories/${id}`, { method: 'DELETE' }),
}
