import React, { useState } from 'react'
import { rawMaterialApi } from '../../services/rawMaterialApi'

type Props = {
  disabled?: boolean
  onCreated?: (category: { id: string; categoryName: string; description?: string }) => void
}

export function RawMaterialCategoryCreateInline({ disabled = false, onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [description, setDescription] = useState('')

  const reset = () => {
    setCategoryName('')
    setDescription('')
    setError(null)
  }

  const handleCreate = async () => {
    const nextName = categoryName.trim()
    if (!nextName || creating) {
      setError(nextName ? null : 'Category name is required.')
      return
    }

    setCreating(true)
    setError(null)
    try {
      const created: any = await rawMaterialApi.createCategory({
        categoryName: nextName,
        description: description.trim() || undefined,
      })
      onCreated?.({
        id: created?.id,
        categoryName: created?.categoryName || nextName,
        description: created?.description || (description.trim() || undefined),
      })
      reset()
      setOpen(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to create category.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => {
          setOpen((current) => !current)
          setError(null)
        }}
        disabled={disabled}
      >
        {open ? 'Cancel new category' : 'Add category'}
      </button>

      {open ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">New category name</span>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Lining"
                disabled={disabled || creating}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Description</span>
              <textarea
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes..."
                disabled={disabled || creating}
              />
            </label>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-red-600" role="alert">
                {error || '\u00a0'}
              </p>
              <button
                type="button"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                onClick={() => void handleCreate()}
                disabled={disabled || creating}
              >
                {creating ? 'Creating...' : 'Create category'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
