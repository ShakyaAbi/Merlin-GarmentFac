import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { api } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'

type BomItem = { rawMaterialId: string; consumption: number; unit: string; rate: number; yield?: number | '' }
type MaterialOption = { id: string; name: string; sku?: string | null; defaultUnit?: string | null; costPrice?: number | null; averageUnitCost?: number | null }

const emptyItem = (): BomItem => ({ rawMaterialId: '', consumption: 1, unit: 'pcs', rate: 0, yield: '' })

const money = (value: number) => `NPR ${value.toFixed(2)}`

export default function CreateArticlePage() {
  const navigate = useNavigate()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [articleNumber, setArticleNumber] = useState('')
  const [name, setName] = useState('')
  const [articleSku, setArticleSku] = useState('')
  const [articleCode, setArticleCode] = useState('')
  const [category, setCategory] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [sellingPrice, setSellingPrice] = useState('0')
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

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null)
      return
    }
    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  useEffect(() => {
    setItems((current) =>
      current.map((item) => {
        const material = materials.find((row) => row.id === item.rawMaterialId)
        const cost = Number(material?.costPrice ?? material?.averageUnitCost ?? item.rate ?? 0)
        return material && item.rate !== cost
          ? { ...item, unit: material.defaultUnit || item.unit, rate: cost }
          : item
      }),
    )
  }, [materials])

  const canSave = useMemo(
    () => Boolean(name.trim() && unit.trim() && items.some((item) => item.rawMaterialId && Number(item.consumption) > 0)),
    [items, name, unit],
  )

  const totalLines = useMemo(() => items.filter((item) => item.rawMaterialId).length, [items])
  const totalCost = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.consumption || 0) * Number(item.rate || 0), 0),
    [items],
  )
  const profitPerUnit = useMemo(() => Number(sellingPrice || 0) - totalCost, [sellingPrice, totalCost])
  const margin = useMemo(() => {
    const price = Number(sellingPrice || 0)
    return price > 0 ? (profitPerUnit / price) * 100 : 0
  }, [profitPerUnit, sellingPrice])

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
      const payloadCostPrice = totalCost
      const article = await api.post<any>('/inventory/finished-goods', {
        sku: articleSku.trim() || articleNumber || undefined,
        productCode: articleCode.trim() || articleNumber || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        unit: unit.trim(),
        sellingPrice: Number(sellingPrice || 0),
        costPrice: payloadCostPrice,
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

      if (imageFile) {
        const formData = new FormData()
        formData.append('image', imageFile)
        await api.post(`/inventory/finished-goods/${article.id}/image`, formData)
      }

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
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
              <div className="font-semibold">Please fix the following issue</div>
              <div className="mt-1">{error}</div>
            </div>
          ) : null}

          <InventorySectionCard title="Article Details" description="This is the stock item the business sells.">
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-[160px_1fr]">
              <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {imagePreview ? (
                  <img src={imagePreview} alt="Article preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="px-3 text-center text-xs text-slate-500">No article image selected</div>
                )}
              </div>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Article image</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
                <div className="text-xs text-slate-500">Upload a JPG or PNG. The file is stored on the server and linked to this article.</div>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Article number</span>
                <input className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2" value={articleNumber} readOnly />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Article name</span>
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Unit</span>
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Category</span>
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)} />
              </label>
            </div>
            <label className="mt-4 block space-y-1 text-sm font-medium text-slate-700">
              <span>Description</span>
              <textarea className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>

            <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3" open={showAdvanced} onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
                Advanced details
                <span className="ml-2 text-xs font-normal text-slate-500">SKU, code, pricing, and reorder settings</span>
              </summary>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  <span>Selling price</span>
                  <input className="w-full rounded-xl border border-slate-300 px-3 py-2" type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  <span>Material cost</span>
                  <input className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2" type="number" value={totalCost.toFixed(2)} readOnly />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  <span>Reorder level</span>
                  <input className="w-full rounded-xl border border-slate-300 px-3 py-2" type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  <span>Article SKU</span>
                  <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={articleSku} onChange={(e) => setArticleSku(e.target.value)} />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
                  <span>Article Code</span>
                  <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={articleCode} onChange={(e) => setArticleCode(e.target.value)} />
                </label>
              </div>
            </details>
          </InventorySectionCard>

          <InventorySectionCard
            title="Article Materials"
            description="Pick raw materials and the cost is pulled from the material record."
            action={
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setItems((current) => [...current, emptyItem()])}>Add material</Button>
                <Button type="button" variant="ghost" onClick={() => setItems([emptyItem()])}>Reset</Button>
              </div>
            }
          >
            {loadingMaterials ? (
              <div className="py-8 text-sm text-slate-500">Loading material options...</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">No.</th>
                      <th className="px-4 py-3 min-w-[18rem]">Raw Material</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">UOM</th>
                      <th className="px-4 py-3">Material cost</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => {
                      const material = materials.find((row) => row.id === item.rawMaterialId)
                      const autoRate = Number(material?.costPrice ?? material?.averageUnitCost ?? item.rate ?? 0)
                      const amount = Number(item.consumption || 0) * autoRate
                      return (
                        <tr key={idx}>
                          <td className="px-4 py-3">{idx + 1}</td>
                          <td className="px-4 py-3 min-w-[18rem]">
                            <select
                              className="min-w-[16rem] rounded-xl border border-slate-300 px-3 py-2 text-sm"
                              value={item.rawMaterialId}
                              onChange={(e) => {
                                const selected = materials.find((m) => m.id === e.target.value)
                                updateItem(idx, {
                                  rawMaterialId: e.target.value,
                                  unit: selected?.defaultUnit || item.unit,
                                  rate: Number(selected?.costPrice ?? selected?.averageUnitCost ?? 0),
                                })
                              }}
                            >
                              <option value="">{loadingMaterials ? 'Loading...' : 'Select material'}</option>
                              {materials.map((material) => (
                                <option key={material.id} value={material.id}>
                                  {material.name}
                                  {material.sku ? ` - ${material.sku}` : ''}
                                </option>
                              ))}
                            </select>
                            <div className="mt-1 min-w-[16rem] text-xs text-slate-500">
                              {material?.name || 'Choose a material'}
                              {material ? ` · ${money(Number(material.costPrice ?? material.averageUnitCost ?? 0))}` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-right" type="number" min={0.01} step="0.01" value={item.consumption} onChange={(e) => updateItem(idx, { consumption: Number(e.target.value) || 0 })} />
                          </td>
                          <td className="px-4 py-3">
                            <input className="w-24 rounded-xl border border-slate-300 px-3 py-2" value={item.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} />
                          </td>
                          <td className="px-4 py-3">
                            <input className="w-28 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-right" type="number" value={autoRate.toFixed(2)} readOnly />
                          </td>
                          <td className="px-4 py-3">{amount.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => setItems((current) => current.filter((_, i) => i !== idx))}
                              disabled={items.length === 1}
                              aria-label="Remove material row"
                              title="Remove material row"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" className="whitespace-nowrap" onClick={save} disabled={saving || !canSave}>{saving ? 'Saving...' : 'Save Article'}</Button>
              <Button type="button" variant="outline" className="whitespace-nowrap" onClick={() => navigate('/inventory/finished-goods')}>Cancel</Button>
            </div>
          </InventorySectionCard>
        </div>

        <div className="space-y-6">
          <InventorySectionCard title="Summary" description="What will be created.">
            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Article</div>
                <div className="mt-1 text-base font-semibold text-slate-900">{name.trim() || 'Untitled'}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-white px-2 py-1">#{articleNumber || '-'}</span>
                  <span className="rounded-full bg-white px-2 py-1">{unit || 'unit'}</span>
                  <span className="rounded-full bg-white px-2 py-1">{category.trim() || 'No category'}</span>
                </div>
              </div>
              <div className="flex justify-between"><span>Material rows</span><span className="font-semibold text-slate-900">{totalLines}</span></div>
              <div className="flex justify-between"><span>Estimated material cost</span><span className="font-semibold text-slate-900">{money(totalCost)}</span></div>
              <div className="flex justify-between"><span>Selling price</span><span className="font-semibold text-slate-900">NPR {Number(sellingPrice || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Profit / unit</span><span className={`font-semibold ${profitPerUnit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(profitPerUnit)}</span></div>
              <div className="flex justify-between"><span>Margin</span><span className="font-semibold text-slate-900">{margin.toFixed(1)}%</span></div>
            </div>
          </InventorySectionCard>
          <InventorySectionCard title="Article vs raw materials" description="Raw materials are components; articles are the sellable products built from them.">
            <div className="text-sm text-slate-600">
              Raw materials are components in the material bill. This page creates the sellable article, then attaches the raw material quantities needed to make one unit.
            </div>
          </InventorySectionCard>
        </div>
      </div>
    </InventoryPageShell>
  )
}
