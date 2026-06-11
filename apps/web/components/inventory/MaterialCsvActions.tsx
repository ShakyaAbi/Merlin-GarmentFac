import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { rawMaterialApi } from '../../services/rawMaterialApi'

type Props = {
  filters?: Record<string, any>
  title?: string
  onSuccess?: () => void
}

export function MaterialCsvActions({ filters = {}, title = 'Materials CSV', onSuccess }: Props) {
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleExport = async () => {
    setLoading(true)
    setError(null)
    try {
      const blob = await rawMaterialApi.exportCSV(filters)
      downloadBlob(blob, `materials_${new Date().toISOString().split('T')[0]}.csv`)
      setShowExport(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to export CSV')
    } finally {
      setLoading(false)
    }
  }

  const handleTemplate = async () => {
    setLoading(true)
    setError(null)
    try {
      const blob = await rawMaterialApi.downloadImportTemplate()
      downloadBlob(blob, `materials_import_template.csv`)
    } catch (err: any) {
      setError(err?.message || 'Failed to download template')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file) {
      setError('Choose a CSV file first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await rawMaterialApi.uploadCSV(file)
      setShowImport(false)
      setFile(null)
      onSuccess?.()
    } catch (err: any) {
      setError(err?.message || 'Failed to import CSV')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setShowImport(true)}>
          Import CSV
        </Button>
        <Button type="button" variant="outline" onClick={() => setShowExport(true)}>
          Export CSV
        </Button>
      </div>

      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title={`Import ${title}`} size="md">
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Download the template, fill it with material records, then upload the CSV.
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={handleTemplate} disabled={loading}>
              Download Template
            </Button>
            <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              {file ? file.name : 'Choose CSV'}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowImport(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleImport} disabled={loading || !file}>
              {loading ? 'Importing...' : 'Import CSV'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showExport} onClose={() => setShowExport(false)} title={`Export ${title}`} size="md">
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Export the current material catalog or the selected material set as CSV.
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowExport(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleExport} disabled={loading}>
              {loading ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
