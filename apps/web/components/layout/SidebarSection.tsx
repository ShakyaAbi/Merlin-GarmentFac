import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { SidebarSectionConfig } from './layoutNav'
import { Link, useLocation } from 'react-router-dom'

type Props = {
  section: SidebarSectionConfig
  isCollapsed: boolean
  isOpen: boolean
  onToggle: () => void
  onNavigate: () => void
}

export function SidebarSection({ section, isCollapsed, isOpen, onToggle, onNavigate }: Props) {
  const location = useLocation()

  return (
    <div>
      {!isCollapsed && section.label ? (
        section.collapsible !== false ? (
          <button
            type="button"
            onClick={onToggle}
            className="mb-2 flex w-full items-center justify-between px-3 text-left text-xs font-semibold text-slate-300 transition-colors hover:text-slate-100"
          >
            <span>{section.label}</span>
            <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <div className="mb-2 px-3 text-xs font-semibold text-slate-500">
            {section.label}
          </div>
        )
      ) : null}

      {(isOpen || isCollapsed) && (
        <div className="space-y-1">
          {section.items.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
              title={isCollapsed ? item.label : ''}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex items-center ${
                isCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                } py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                <item.icon
                  className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-slate-950' : 'text-slate-300 group-hover:text-white'
                  }`}
                />
                {!isCollapsed ? <span className="whitespace-nowrap">{item.label}</span> : null}
              </div>
                {!isCollapsed && isActive ? <ChevronRight className="w-4 h-4 text-slate-400" /> : null}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
