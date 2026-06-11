import React, { useState } from 'react'
import { Download, FileDown, FileSpreadsheet, Package } from 'lucide-react'
import { InventoryPageShell } from '../components/inventory/InventoryPageShell'
import { InventorySectionCard } from '../components/inventory/InventorySectionCard'
import { Button } from '../components/ui/Button'
import { rawMaterialApi } from '../services/rawMaterialApi'
import { salesInvoiceApi } from '../services/salesInvoiceApi'

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}

export default function ExportCenterPage() {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (key: string, fn: () => Promise<Blob>, filename: string) => {
    setBusy(key)
    setError(null)
    try {
      const blob = await fn()
      downloadBlob(blob, filename)
    } catch (err: any) {
      setError(err?.message || 'Export failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <InventoryPageShell
      eyebrow="Exports"
      title="Export Center"
      description="Download CSV outputs for materials and sales activity from the existing Merlin endpoints."
    >
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InventorySectionCard title="Material Exports" description="Catalog and import-template downloads for raw materials.">
          <div className="space-y-3">
            <Button type="button" variant="outline" className="w-full justify-start" onClick={() => void run('materials-export', () => rawMaterialApi.exportCSV({}), `materials_${new Date().toISOString().split('T')[0]}.csv`)} isLoading={busy === 'materials-export'}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export materials CSV
            </Button>
            <Button type="button" variant="outline" className="w-full justify-start" onClick={() => void run('materials-template', () => rawMaterialApi.downloadImportTemplate(), 'materials_import_template.csv')} isLoading={busy === 'materials-template'}>
              <Download className="mr-2 h-4 w-4" />
              Download material import template
            </Button>
          </div>
        </InventorySectionCard>

        <InventorySectionCard title="Sales Exports" description="Invoice exports for collections and reporting.">
          <div className="space-y-3">
            <Button type="button" variant="outline" className="w-full justify-start" onClick={() => void run('invoices-export', () => salesInvoiceApi.export({}), `merlin-sales-invoices_${new Date().toISOString().split('T')[0]}.csv`)} isLoading={busy === 'invoices-export'}>
              <FileDown className="mr-2 h-4 w-4" />
              Export sales invoices CSV
            </Button>
            <Button type="button" variant="outline" className="w-full justify-start" onClick={() => window.location.hash = '#/sales-invoices'}>
              <Package className="mr-2 h-4 w-4" />
              Open sales invoices
            </Button>
          </div>
        </InventorySectionCard>
      </div>
    </InventoryPageShell>
  )
}
