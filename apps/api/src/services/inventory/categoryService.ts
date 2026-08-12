import * as repo from '../../repositories/inventory/categoryRepository'

export const listCategories = async () => repo.listCategories()
export const createCategory = async (data: { categoryName: string; description?: string }) => repo.createCategory(data)
export const getCategory = async (id: string) => repo.getCategory(id)
export const deleteCategory = async (id: string) => repo.deleteCategory(id)
