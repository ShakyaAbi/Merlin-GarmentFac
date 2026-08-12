import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { CategoryManager } from '../../components/inventory/CategoryManager'
import { rawMaterialApi } from '../../services/rawMaterialApi'
import { articleCategoryApi } from '../../services/articleCategoryApi'

type CategoryKind = 'materials' | 'articles'

export default function CategoryManagementPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const kind = (params.get('kind') === 'articles' ? 'articles' : 'materials') as CategoryKind

  const title = kind === 'articles' ? 'Article Categories' : 'Raw Material Categories'
  const description =
    kind === 'articles'
      ? 'Manage reusable article categories for finished goods.'
      : 'Manage reusable raw material categories for supplier and material records.'

  const manager = useMemo(
    () =>
      kind === 'articles'
        ? {
            loadCategories: () => articleCategoryApi.getCategories(),
            createCategory: (data: { label: string; description?: string }) =>
              articleCategoryApi.createCategory({ name: data.label, description: data.description }),
            deleteCategory: (id: string) => articleCategoryApi.deleteCategory(id),
          }
        : {
            loadCategories: () => rawMaterialApi.getCategories(),
            createCategory: (data: { label: string; description?: string }) =>
              rawMaterialApi.createCategory({ categoryName: data.label, description: data.description }),
            deleteCategory: (id: string) => rawMaterialApi.deleteCategory(id),
          },
    [kind],
  )

  return (
    <InventoryPageShell
      eyebrow="Inventory"
      title="Category Management"
      description="Create and maintain shared categories used across inventory forms."
      backTo={{ to: '/inventory/materials', label: 'Back to inventory' }}
      actions={[
        { label: 'Raw materials', variant: kind === 'materials' ? 'primary' : 'outline', onClick: () => setParams({ kind: 'materials' }) },
        { label: 'Articles', variant: kind === 'articles' ? 'primary' : 'outline', onClick: () => setParams({ kind: 'articles' }) },
        { label: 'Materials', variant: 'outline', to: '/inventory/materials' },
        { label: 'Articles', variant: 'outline', to: '/inventory/finished-goods' },
      ]}
    >
      <CategoryManager
        title={title}
        description={description}
        itemLabel={kind === 'articles' ? 'Article' : 'Raw material'}
        loadCategories={manager.loadCategories}
        createCategory={manager.createCategory}
        deleteCategory={manager.deleteCategory}
      />
    </InventoryPageShell>
  )
}
