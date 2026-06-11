import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'

type BomItem = {
  rawMaterialId: string
  consumption: number
  unit: string
  yield?: number | ''
}

type MaterialOption = {
  id: string
  name: string
  sku?: string | null
  defaultUnit?: string | null
  currentStock?: number | null
}

type BomTab = 'details' | 'operations' | 'costing' | 'notes'

export default function CreateBomPage() {
  const [params] = useSearchParams()
  const materialId = params.get('material')
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<BomTab>('details')
  const [name, setName] = useState('')
  const [garmentStyle, setGarmentStyle] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [isDefault, setIsDefault] = useState(true)
  const [isActive, setIsActive] = useState(true)
  const [allowAlternativeItem, setAllowAlternativeItem] = useState(false)
  const [setSubAssemblyRateByBom, setSetSubAssemblyRateByBom] = useState(false)
  const [project, setProject] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<BomItem[]>(
    materialId ? [{ rawMaterialId: materialId, consumption: 1, unit: 'pcs', yield: '' }] : [],
  )
  const [materials, setMaterials] = useState<MaterialOption[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    api
      .get('/inventory/materials')
      .then((data: any) => {
        if (!alive) return
        const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
        setMaterials(rows)
      })
      .catch((err: any) => {
        if (!alive) return
        setError(err?.message || 'Failed to load material options.')
      })
      .finally(() => {
        if (alive) setLoadingMaterials(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const canSave = useMemo(() => {
    return Boolean(
      name.trim() &&
        garmentStyle.trim() &&
        items.length > 0 &&
        items.every((item) => item.rawMaterialId.trim() && Number(item.consumption) > 0 && item.unit.trim()),
    )
  }, [garmentStyle, items, name])

  const totalConsumption = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.consumption || 0), 0),
    [items],
  )

  const estimatedLines = useMemo(
    () =>
      items
        .filter((item) => item.rawMaterialId)
        .map((item) => {
          const material = materials.find((candidate) => candidate.id === item.rawMaterialId)
          return {
            materialName: material?.name || 'Unknown material',
            sku: material?.sku || '',
            quantity: Number(item.consumption || 0),
            unit: item.unit || material?.defaultUnit || 'unit',
          }
        }),
    [items, materials],
  )

  const addItem = () =>
    setItems((current) => [...current, { rawMaterialId: '', consumption: 0, unit: 'pcs', yield: '' }])

  const updateItem = (idx: number, patch: Partial<BomItem>) => {
    const next = [...items]
    next[idx] = { ...next[idx], ...patch }
    setItems(next)
  }

  const removeItem = (idx: number) => {
    setItems((current) => current.filter((_, index) => index !== idx))
  }

  const save = async () => {
    setError(null)
    if (!canSave) {
      setError('Fill the BOM name, garment style, and at least one valid item.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        garmentStyle: garmentStyle.trim(),
        items: items.map((item) => ({
          rawMaterialId: item.rawMaterialId,
          consumption: Number(item.consumption),
          unit: item.unit.trim(),
          yield: item.yield === '' ? undefined : Number(item.yield),
        })),
      }

      await api.post('/inventory/boms', payload)
      navigate('/inventory/materials')
    } catch (err: any) {
      setError(err?.message || 'Failed to create BOM.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <InventoryPageShell
      eyebrow="Inventory"
      title="New BOM"
      description="Create a bill of materials in an ERPNext-style layout while keeping Merlin's native flow."
      backTo={{ to: '/inventory/materials', label: 'Back to materials' }}
      actions={[
        { label: 'Materials', variant: 'outline', to: '/inventory/materials' },
        { label: 'Purchases', variant: 'outline', to: '/inventory/purchases' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {[
            { key: 'details', label: 'Details' },
            { key: 'operations', label: 'Operations' },
            { key: 'costing', label: 'Costing' },
            { key: 'notes', label: 'More Info' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as BomTab)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {canSave ? 'Ready to save' : 'Draft'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            {activeTab === 'details' && (
              <InventorySectionCard
                title="Production Item"
                description="Define the finished garment before listing the raw materials."
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" onClick={addItem}>
                      Add row
                    </Button>
                    <Button type="button" onClick={save} disabled={saving || !canSave}>
                      {saving ? 'Saving...' : 'Save BOM'}
                    </Button>
                  </div>
                }
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Series *</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono"
                      value="BOM-.YYYY.-"
                      readOnly
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Date *</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      value={new Date().toLocaleDateString('en-GB')}
                      readOnly
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Company *</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      value="Merlin Lite"
                      readOnly
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">BOM Name *</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Bamboo shirt v1"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Garment Style *</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      value={garmentStyle}
                      onChange={(e) => setGarmentStyle(e.target.value)}
                      placeholder="Shirt, trouser, dress..."
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Quantity *</span>
                    <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  </label>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3">
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                    <span className="text-sm font-medium text-slate-700">Is Active</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3">
                    <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                    <span className="text-sm font-medium text-slate-700">Is Default</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allowAlternativeItem}
                      onChange={(e) => setAllowAlternativeItem(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-slate-700">Allow Alternative Item</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={setSubAssemblyRateByBom}
                      onChange={(e) => setSetSubAssemblyRateByBom(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-slate-700">Set rate of sub-assembly item based on BOM</span>
                  </label>
                </div>
              </InventorySectionCard>
            )}

            {activeTab === 'operations' && (
              <InventorySectionCard title="Operations" description="Keep the BOM route ready for future process steps.">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Project</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      placeholder="Optional project reference"
                    />
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current scope</div>
                    <div className="mt-1 text-sm text-slate-700">
                      This BOM is focused on raw-material consumption and finished-goods planning.
                    </div>
                  </div>
                </div>
              </InventorySectionCard>
            )}

            {activeTab === 'costing' && (
              <InventorySectionCard title="Cost Configuration" description="Keep costing light for now while preserving the ERP-style section.">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lines</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900">{items.length}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total consumption</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900">{totalConsumption.toFixed(2)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900">{canSave ? 'Ready' : 'Draft'}</div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  Cost breakdown can be expanded later without changing the save payload.
                </div>
              </InventorySectionCard>
            )}

            {activeTab === 'notes' && (
              <InventorySectionCard title="More Info" description="Optional context for the BOM.">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Notes</span>
                  <textarea
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    rows={5}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal notes, setup details, or production hints..."
                  />
                </label>
              </InventorySectionCard>
            )}

            <InventorySectionCard
              title="Raw Materials"
              description="Line items are kept dense and table-like to match a production editor."
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={addItem}>
                    Add Row
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setItems([{ rawMaterialId: '', consumption: 0, unit: 'pcs', yield: '' }])}>
                    Reset Rows
                  </Button>
                </div>
              }
            >
              {loadingMaterials ? (
                <div className="py-8 text-center text-sm text-slate-500" role="status" aria-live="polite">
                  Loading material options...
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <caption className="sr-only">BOM raw material items</caption>
                      <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                        <tr>
                          <th className="w-12 px-4 py-3">
                            <input type="checkbox" aria-label="Select all rows" />
                          </th>
                          <th className="px-4 py-3 font-semibold">No.</th>
                          <th className="px-4 py-3 font-semibold">Item Code *</th>
                          <th className="px-4 py-3 font-semibold">Qty *</th>
                          <th className="px-4 py-3 font-semibold">UOM *</th>
                          <th className="px-4 py-3 font-semibold">Rate (INR)</th>
                          <th className="px-4 py-3 font-semibold">Amount (INR)</th>
                          <th className="w-14 px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                              No rows yet. Add a raw material line to begin.
                            </td>
                          </tr>
                        ) : (
                          items.map((item, idx) => {
                            const selectedMaterial = materials.find((material) => material.id === item.rawMaterialId)
                            const lineAmount = Number(item.consumption || 0) * 0
                            return (
                              <tr key={`${idx}-${item.rawMaterialId || 'empty'}`} className="hover:bg-slate-50">
                                <td className="px-4 py-3 align-top">
                                  <input type="checkbox" aria-label={`Select row ${idx + 1}`} />
                                </td>
                                <td className="px-4 py-3 align-top font-medium text-slate-900">{idx + 1}</td>
                                <td className="px-4 py-3 align-top">
                                  <select
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                    value={item.rawMaterialId}
                                    onChange={(e) => {
                                      const nextMaterial = materials.find((material) => material.id === e.target.value)
                                      updateItem(idx, {
                                        rawMaterialId: e.target.value,
                                        unit: nextMaterial?.defaultUnit || item.unit,
                                      })
                                    }}
                                  >
                                    <option value="">{loadingMaterials ? 'Loading...' : 'Select material'}</option>
                                    {materials.map((material) => (
                                      <option key={material.id} value={material.id}>
                                        {material.name}{material.sku ? ` • ${material.sku}` : ''}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {selectedMaterial ? `${selectedMaterial.name} ${selectedMaterial.sku ? `• ${selectedMaterial.sku}` : ''}` : 'Choose a material'}
                                  </div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <input
                                    className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-right"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={item.consumption}
                                    onChange={(e) => updateItem(idx, { consumption: Number(e.target.value) })}
                                  />
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <input
                                    className="w-24 rounded-xl border border-slate-300 px-3 py-2"
                                    value={item.unit}
                                    onChange={(e) => updateItem(idx, { unit: e.target.value })}
                                    placeholder="pcs"
                                  />
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <input
                                    className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-right"
                                    type="number"
                                    value={0}
                                    readOnly
                                  />
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <input
                                    className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-right"
                                    type="number"
                                    value={lineAmount.toFixed(2)}
                                    readOnly
                                  />
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <button
                                    type="button"
                                    onClick={() => removeItem(idx)}
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-red-300 hover:text-red-600"
                                    disabled={items.length === 1}
                                  >
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span>Showing 1 - {items.length} of {items.length} entries</span>
                      <span>Selected: 0</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        Add Row
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={save} disabled={saving || !canSave}>
                        {saving ? 'Saving...' : 'Save BOM'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </InventorySectionCard>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <InventorySectionCard title="Document Summary" description="A quick read of the draft you're building.">
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Name</span>
                  <span className="font-semibold text-slate-900">{name.trim() || 'Untitled BOM'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Garment style</span>
                  <span className="font-semibold text-slate-900">{garmentStyle.trim() || 'Not set'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Rows</span>
                  <span className="font-semibold text-slate-900">{items.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total consumption</span>
                  <span className="font-semibold text-slate-900">{totalConsumption.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active</span>
                  <span className="font-semibold text-slate-900">{isActive ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Default</span>
                  <span className="font-semibold text-slate-900">{isDefault ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </InventorySectionCard>

            <InventorySectionCard title="Used Materials" description="The raw materials linked in this draft.">
              {estimatedLines.length === 0 ? (
                <div className="text-sm text-slate-500">No linked materials yet.</div>
              ) : (
                <ul className="space-y-2 text-sm text-slate-700">
                  {estimatedLines.map((line, index) => (
                    <li key={`${line.materialName}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                      <span className="font-medium">{line.materialName}</span>
                      <span className="text-xs text-slate-500">
                        {line.sku || line.unit} · {line.quantity.toFixed(2)} {line.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </InventorySectionCard>

            <InventorySectionCard title="Actions" description="Save or leave without losing your draft.">
              <div className="flex flex-col gap-2">
                <Button type="button" onClick={save} disabled={saving || !canSave}>
                  {saving ? 'Saving...' : 'Save BOM'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/inventory/materials')}>
                  Cancel
                </Button>
              </div>
            </InventorySectionCard>
          </div>
        </div>
      </div>
    </InventoryPageShell>
  )
}
