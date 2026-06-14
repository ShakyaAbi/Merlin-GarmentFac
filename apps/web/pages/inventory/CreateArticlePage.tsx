import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'

type BomItem = { rawMaterialId: string; consumption: number; unit: string; rate: number; yield?: number | '' }
type MaterialOption = { id: string; name: string; sku?: string | null; defaultUnit?: string | null }

const emptyItem = (): BomItem => ({ rawMaterialId: '', consumption: 1, unit: 'pcs', rate: 0, yield: '' })

export default function CreateArticlePage() {
  const navigate = useNavigate()
  const [articleNumber, setArticleNumber] = useState('')
  const [name, setName] = useState('')
  const [articleSku, setArticleSku] = useState('')
  const [articleCode, setArticleCode] = useState('')
  const [category, setCategory] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [sellingPrice, setSellingPrice] = useState('0')
  const [costPrice, setCostPrice] = useState('0')
  const [reorderLevel, setReorderLevel] = useState('')
  const [items, setItems] = useState<BomItem[]>([emptyItem()])
  const [materials, setMaterials] = useState<MaterialOption[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api.get('/inventory/finished-goods/next-number').then((data: any) => {
      if (!alive) return
      setArticleNumber(data?.articleNumber || '')
    }).catch(() => {
      if (!alive) return
      setArticleNumber('')
    })
    api.get('/inventory/materials').then((data: any) => {
      if (!alive) return
      const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
      setMaterials(rows)
    }).catch((err: any) => alive && setError(err?.message || 'Failed to load material options.')).finally(() => alive && setLoadingMaterials(false))
    return () => { alive = false }
  }, [])

  const canSave = useMemo(
    () => Boolean(name.trim() && unit.trim() && items.some((item) => item.rawMaterialId && Number(item.consumption) > 0)),
    [items, name, unit],
  )

  const totalLines = useMemo(() => items.filter((item) => item.rawMaterialId).length, [items])

  const updateItem = (idx: number, patch: Partial<BomItem>) => {
    setItems((current) => {
      const next = [...current]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  const save = async () => {
    if (!canSave) {
      setError('Name, unit, and at least one raw material line are required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const article = await api.post<any>('/inventory/finished-goods', {
        sku: articleSku.trim() || articleNumber || undefined,
        productCode: articleCode.trim() || articleNumber || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        unit: unit.trim(),
        sellingPrice: Number(sellingPrice || 0),
        costPrice: Number(costPrice || 0),
        reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
        notes: notes.trim() || undefined,
        bomData: {
          name: name.trim(),
          garmentStyle: category.trim() || name.trim(),
          items: items
            .filter((item) => item.rawMaterialId && Number(item.consumption) > 0)
            .map((item) => ({
              rawMaterialId: item.rawMaterialId,
              consumption: Number(item.consumption),
              unit: item.unit.trim(),
              rate: Number(item.rate || 0),
              yield: item.yield === '' ? undefined : Number(item.yield),
            })),
        },
      })

      navigate(`/inventory/finished-goods/${article.id}`)
    } catch (err: any) {
      setError(err?.message || 'Failed to create article.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <InventoryPageShell
      eyebrow="Inventory"
      title="Create Article"
      description="Create the sellable article and define its material bill in one flow."
      backTo={{ to: '/inventory/finished-goods', label: 'Back to articles' }}
      actions={[{ label: 'Articles', variant: 'outline', to: '/inventory/finished-goods' }]}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <InventorySectionCard title="Article Details" description="This is the stock item the business sells.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2" placeholder="Article number" value={articleNumber} readOnly />
              <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Article name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
              <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
              <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Reorder level" type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
              <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Selling price" type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
              <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Cost price" type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
              <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Article SKU (optional)" value={articleSku} onChange={(e) => setArticleSku(e.target.value)} />
              <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Article Code (optional)" value={articleCode} onChange={(e) => setArticleCode(e.target.value)} />
            </div>
            <textarea className="mt-4 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </InventorySectionCard>

          <InventorySectionCard
            title="Article Materials"
            description="These raw materials define how the article is built."
            action={<Button type="button" variant="outline" onClick={() => setItems((current) => [...current, emptyItem()])}>Add Row</Button>}
          >
            {loadingMaterials ? (
              <div className="py-8 text-sm text-slate-500">Loading material options...</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">No.</th>
                      <th className="px-4 py-3">Raw Material</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">UOM</th>
                      <th className="px-4 py-3">Rate (NPR)</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => {
                      const material = materials.find((row) => row.id === item.rawMaterialId)
                      const amount = Number(item.consumption || 0) * Number(item.rate || 0)
                      return (
                        <tr key={idx}>
                          <td className="px-4 py-3">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <select className="w-full rounded-xl border border-slate-300 px-3 py-2" value={item.rawMaterialId} onChange={(e) => updateItem(idx, { rawMaterialId: e.target.value, unit: materials.find((m) => m.id === e.target.value)?.defaultUnit || item.unit })}>
                              <option value="">{loadingMaterials ? 'Loading...' : 'Select material'}</option>
                              {materials.map((material) => (
                                <option key={material.id} value={material.id}>
                                  {material.name}
                                  {material.sku ? ` - ${material.sku}` : ''}
                                </option>
                              ))}
                            </select>
                            <div className="mt-1 text-xs text-slate-500">{material?.name || 'Choose a material'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <input className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-right" type="number" min={0.01} step="0.01" value={item.consumption} onChange={(e) => updateItem(idx, { consumption: Number(e.target.value) || 0 })} />
                          </td>
                          <td className="px-4 py-3">
                            <input className="w-24 rounded-xl border border-slate-300 px-3 py-2" value={item.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} />
                          </td>
                          <td className="px-4 py-3">
                            <input className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-right" type="number" min={0} step="0.01" value={item.rate} onChange={(e) => updateItem(idx, { rate: Number(e.target.value) || 0 })} />
                          </td>
                          <td className="px-4 py-3">{amount.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <Button type="button" size="sm" variant="outline" onClick={() => setItems((current) => current.filter((_, i) => i !== idx))} disabled={items.length === 1}>
                              Remove
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={save} disabled={saving || !canSave}>{saving ? 'Saving...' : 'Save Article'}</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/inventory/finished-goods')}>Cancel</Button>
            </div>
            {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          </InventorySectionCard>
        </div>

        <div className="space-y-6">
          <InventorySectionCard title="Summary" description="What will be created.">
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between"><span>Article</span><span className="font-semibold text-slate-900">{name.trim() || 'Untitled'}</span></div>
              <div className="flex justify-between"><span>Number</span><span className="font-semibold text-slate-900">{articleNumber || '-'}</span></div>
              <div className="flex justify-between"><span>Material rows</span><span className="font-semibold text-slate-900">{totalLines}</span></div>
              <div className="flex justify-between"><span>Unit</span><span className="font-semibold text-slate-900">{unit || '-'}</span></div>
            </div>
          </InventorySectionCard>
          <InventorySectionCard title="Why this flow" description="Articles and material definition now live together.">
            <div className="text-sm text-slate-600">
              You create the sellable article once, then attach its material bill immediately. That keeps the model easier to reason about and removes the separate BOM-first workflow.
            </div>
          </InventorySectionCard>
        </div>
      </div>
    </InventoryPageShell>
  )
}
