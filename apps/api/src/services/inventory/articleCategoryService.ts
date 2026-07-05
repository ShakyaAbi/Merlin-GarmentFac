import * as repo from '../../repositories/inventory/articleCategoryRepository'

export const listCategories = async () => repo.listCategories()
export const createCategory = async (data: { name: string; description?: string }) => repo.createCategory(data)
export const getCategory = async (id: string) => repo.getCategory(id)
export const deleteCategory = async (id: string) => repo.deleteCategory(id)
