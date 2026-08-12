import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/Button'

type CategoryItem = {
  id: string
  label: string
  description?: string | null
}

type Props = {
  title: string
  description: string
  itemLabel: string
  loadCategories: () => Promise<any[]>
  createCategory: (data: { label: string; description?: string }) => Promise<any>
  deleteCategory: (id: string) => Promise<void>
}

export function CategoryManager({ title, description, itemLabel, loadCategories, createCategory, deleteCategory }: Props) {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [details, setDetails] = useState('')

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await loadCategories()
      setCategories(
        Array.isArray(data)
          ? data.map((item: any) => ({
              id: item.id,
              label: item.name || item.categoryName || item.label,
              description: item.description,
            }))
          : [],
      )
    } catch (err: any) {
      setError(err?.message || `Failed to load ${itemLabel.toLowerCase()} categories.`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const canCreate = useMemo(() => Boolean(name.trim()), [name])

  const submit = async () => {
    const next = name.trim()
    if (!next || saving) return
    setSaving(true)
    setError(null)
    try {
      await createCategory({ label: next, description: details.trim() || undefined })
      setName('')
      setDetails('')
      await refresh()
    } catch (err: any) {
      setError(err?.message || `Failed to create ${itemLabel.toLowerCase()} category.`)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string, label: string) => {
    if (!window.confirm(`Delete ${label}?`)) return
    setError(null)
    try {
      await deleteCategory(id)
      await refresh()
    } catch (err: any) {
      setError(err?.message || `Failed to delete ${itemLabel.toLowerCase()} category.`)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>

        {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {loading ? (
          <div className="py-10 text-sm text-slate-500">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="py-10 text-sm text-slate-500">No categories yet.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{category.label}</td>
                    <td className="px-4 py-3 text-slate-600">{category.description || '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        onClick={() => void remove(category.id, category.label)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Create category</h3>
        <p className="mt-1 text-sm text-slate-600">Add a new {itemLabel.toLowerCase()} category and reuse it immediately in forms.</p>

        <div className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Category name</span>
            <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Example: Casual Wear" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Description</span>
            <textarea className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Optional notes..." />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">Used by both article and raw material forms.</span>
          <Button type="button" onClick={() => void submit()} disabled={!canCreate || saving}>
            {saving ? 'Saving...' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}
