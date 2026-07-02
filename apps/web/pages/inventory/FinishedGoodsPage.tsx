import React, { useEffect, useMemo, useState } from 'react'
import { finishedGoodApi } from '../../services/finishedGoodApi'
import { InventoryPageShell } from '../../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../../components/inventory/InventorySectionCard'
import { Button } from '../../components/ui/Button'
import { useNavigate } from 'react-router-dom'
import { ArticleCategorySelect } from '../../components/inventory/ArticleCategorySelect'
import { FinishedGoodCsvActions } from '../../components/inventory/FinishedGoodCsvActions'

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR' }).format(Number(value ?? 0))

export default function FinishedGoodsPage() {
  const navigate = useNavigate()
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [articleCategoryId, setArticleCategoryId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await finishedGoodApi.list({ page: 1, pageSize: 500 })
      setArticles(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load articles.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return articles.filter((item) =>
      (!articleCategoryId || item.articleCategoryId === articleCategoryId) &&
      (!q ||
        [item.name, item.sku, item.productCode, item.category, item.unit]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))),
    )
  }, [articleCategoryId, articles, search])

  const stats = useMemo(() => {
    const totalStock = filteredItems.reduce((sum, item) => sum + Number(item.currentStock ?? 0), 0)
    const lowStock = filteredItems.filter((item) => item.reorderLevel != null && Number(item.currentStock ?? 0) <= Number(item.reorderLevel)).length
    const totalValue = filteredItems.reduce((sum, item) => sum + Number(item.currentStock ?? 0) * Number(item.sellingPrice ?? 0), 0)
    return { total: filteredItems.length, totalStock, lowStock, totalValue }
  }, [filteredItems])

  const deleteItem = async (id: string) => {
    if (!window.confirm('Delete this article?')) return
    setError(null)
    try {
      await api.delete(`/inventory/finished-goods/${id}`)
      await loadItems()
    } catch (err: any) {
      setError(err?.message || 'Failed to delete article.')
    }
  }

  return (
    <InventoryPageShell
      eyebrow="Sales Master"
      title="Articles"
      description="Manage sellable products built from raw material bills and used by sales invoices."
      backTo={{ to: '/inventory/production', label: 'Back to production batches' }}
      actions={[
        { label: 'Create Article', variant: 'outline', to: '/inventory/finished-goods/create' },
        { label: 'Manage Categories', variant: 'secondary', to: '/inventory/categories?kind=articles' },
        { label: 'New Invoice', variant: 'outline', to: '/sales-invoices/create' },
      ]}
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <InventorySectionCard
            title="Article Catalog"
            description="Search and open an article to manage stock and the attached material bill."
          >
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="grid w-full gap-3 md:grid-cols-2">
                <label className="sr-only" htmlFor="article-search">
                  Search articles
                </label>
                <input
                  id="article-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search articles"
                  aria-label="Search articles"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <ArticleCategorySelect
                  value={articleCategoryId}
                  onChange={setArticleCategoryId}
                  label="Filter by category"
                  allowAllOption
                  allLabel="All categories"
                />
              </div>
              <Button type="button" onClick={() => navigate('/inventory/finished-goods/create')}>
                New Article
              </Button>
            </div>

            {error ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">Loading articles...</div>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                {search.trim() || articleCategoryId ? 'No matching articles found.' : 'No articles yet.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {filteredItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="text-[10px] text-slate-400">No image</div>
                          )}
                        </div>
                        <div>
                        <div className="text-xs uppercase tracking-wider text-slate-500">Article</div>
                        <div className="text-lg font-semibold text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.productCode || item.sku || '-'}</div>
                        </div>
                      </div>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${item.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                        {item.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-xs text-slate-500">Category</div>
                        <div className="font-medium text-slate-900">{item.category || '-'}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-xs text-slate-500">Stock</div>
                        <div className="font-medium text-slate-900">{Number(item.currentStock ?? 0)}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-xs text-slate-500">Price</div>
                        <div className="font-medium text-slate-900">{money(item.sellingPrice)}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-xs text-slate-500">Article number</div>
                        <div className="font-medium text-slate-900">{item.productCode || item.sku || '-'}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-xs text-slate-500">Material rows</div>
                        <div className="font-medium text-slate-900">{Array.isArray(item?.bomData?.items) ? item.bomData.items.length : 0}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/inventory/finished-goods/${item.id}`)}>
                        Open
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/inventory/finished-goods/${item.id}?edit=1`)}>
                        Edit
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => deleteItem(item.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </InventorySectionCard>
        </div>

        <div className="space-y-8 lg:col-span-1">
          <InventorySectionCard title="Quick Stats" description="High-level article health and stock position.">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Articles</div>
                <div className="mt-1 text-xl font-bold text-slate-900">{stats.total}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Stock</div>
                <div className="mt-1 text-xl font-bold text-slate-900">{stats.totalStock}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Low stock</div>
                <div className="mt-1 text-xl font-bold text-slate-900">{stats.lowStock}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Value</div>
                <div className="mt-1 text-xl font-bold text-slate-900">{money(stats.totalValue)}</div>
              </div>
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Low Stock" description="Articles below reorder levels.">
            <div className="space-y-3">
              {filteredItems.filter((item) => item.reorderLevel != null && Number(item.currentStock ?? 0) <= Number(item.reorderLevel)).slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm shadow-sm transition hover:bg-amber-100">
                  <div>
                    <div className="font-medium text-slate-900">{item.name}</div>
                    <div className="text-slate-500">Reorder {item.reorderLevel ?? 'N/A'}</div>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/inventory/finished-goods/${item.id}`)}>
                    Open
                  </Button>
                </div>
              ))}
              {filteredItems.filter((item) => item.reorderLevel != null && Number(item.currentStock ?? 0) <= Number(item.reorderLevel)).length === 0 && (
                <div className="text-sm text-slate-500">No low-stock articles.</div>
              )}
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="Quick Actions">
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/inventory/finished-goods/create')}>
                New Article
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/inventory/finished-goods')}>
                Refresh List
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/inventory/materials')}>
                Raw Materials
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/inventory/production')}>
                Production Batches
              </Button>
            </div>
          </InventorySectionCard>

          <InventorySectionCard title="CSV Tools" description="Import or export the article catalog.">
            <FinishedGoodCsvActions
              title="article catalog"
              filters={{ search, articleCategoryId }}
              onSuccess={() => void loadItems()}
            />
          </InventorySectionCard>
        </div>
      </div>
    </InventoryPageShell>
  )
}
