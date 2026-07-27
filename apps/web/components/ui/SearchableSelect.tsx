import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'

export type SearchableSelectOption = {
  value: string
  label: string
  description?: string
  searchText?: string
}

type Props = {
  value: string
  options: SearchableSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = 'Select option',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  disabled = false,
  className = '',
}: Props) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  const selected = useMemo(() => options.find((option) => option.value === value) || null, [options, value])

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((option) =>
      [option.label, option.description, option.searchText]
        .filter(Boolean)
        .some((text) => String(text).toLowerCase().includes(q)),
    )
  }, [options, query])

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const preferredWidth = Math.max(rect.width, 320)
      const width = Math.min(preferredWidth, window.innerWidth - 24)
      const left = Math.min(Math.max(rect.left, 12), Math.max(12, window.innerWidth - width - 12))
      setMenuStyle({
        position: 'fixed',
        top: Math.min(rect.bottom + 6, window.innerHeight - 12),
        left,
        width,
        zIndex: 70,
      })
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
      setQuery('')
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    const frame = requestAnimationFrame(() => inputRef.current?.focus())

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const selectedOption = options.find((option) => option.value === value)
    if (selectedOption) setQuery('')
  }, [open, options, value])

  const closeMenu = () => {
    setOpen(false)
    setQuery('')
  }

  const handleSelect = (nextValue: string) => {
    onChange(nextValue)
    closeMenu()
  }

  const menu = open && typeof document !== 'undefined'
    ? createPortal(
        <div ref={menuRef} style={menuStyle} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20"
                placeholder={searchPlaceholder}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-72 overflow-auto py-1">
            {value ? (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className="flex w-full items-start gap-3 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
              >
                <span className="mt-0.5 h-2.5 w-2.5 rounded-full border border-slate-300" />
                <span>Clear selection</span>
              </button>
            ) : null}

            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const active = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-3 py-2 text-left transition hover:bg-blue-50 ${
                      active ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{option.label}</div>
                        {option.description ? <div className="mt-0.5 truncate text-xs text-slate-500">{option.description}</div> : null}
                      </div>
                      {active ? <span className="mt-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Selected</span> : null}
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="px-3 py-6 text-sm text-slate-500">{emptyMessage}</div>
            )}
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          setOpen((current) => !current)
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'cursor-not-allowed bg-slate-50 text-slate-400' : 'hover:border-blue-300 hover:bg-slate-50'} ${className}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
            {selected?.label || placeholder}
          </span>
          {selected?.description ? <span className="mt-0.5 block truncate text-xs text-slate-500">{selected.description}</span> : null}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {menu}
    </>
  )
}
