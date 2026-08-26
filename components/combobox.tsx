'use client'

import { useState, useRef, useEffect } from 'react'

type Option = { value: string; label: string }

interface ComboboxProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  allowCustom?: boolean
  onCreateOption?: (label: string) => Promise<{ value: string; label: string } | void>
  onDeleteOption?: (value: string) => void
  onEditOption?: (value: string, newLabel: string) => void
  createLabel?: string
  emptyLabel?: string
  className?: string
}

export default function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Selecionar…',
  allowCustom = false,
  onCreateOption,
  onDeleteOption,
  onEditOption,
  createLabel,
  emptyLabel,
  className = '',
}: ComboboxProps) {
  const [open, setOpen]               = useState(false)
  const [query, setQuery]             = useState('')
  const [creating, setCreating]       = useState(false)
  const [hovered, setHovered]         = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string | null>(null)
  const [editLabel, setEditLabel]     = useState('')
  const ref     = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayLabel = options.find((o) => o.value === value)?.label ?? value

  function closeDropdown() {
    setOpen(false)
    setQuery('')
    setEditingValue(null)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) closeDropdown()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const showCreate = (allowCustom || !!onCreateOption) && query.trim() &&
    !options.some((o) => o.label.toLowerCase() === query.toLowerCase())

  const base = `w-full px-3 py-2.5 rounded-xl border border-app-border bg-white text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-wine-500 ${className}`

  async function handleCreate() {
    if (!query.trim()) return
    setCreating(true)
    if (onCreateOption) {
      const result = await onCreateOption(query.trim())
      if (result) onChange(result.value)
    } else {
      onChange(query.trim())
    }
    setCreating(false)
    closeDropdown()
  }

  function commitEdit(optValue: string) {
    if (editLabel.trim() && onEditOption) onEditOption(optValue, editLabel)
    setEditingValue(null)
  }

  function startEdit(e: React.MouseEvent, o: Option) {
    e.stopPropagation()
    setEditingValue(o.value)
    setEditLabel(o.label)
  }

  function handleDeleteClick(e: React.MouseEvent, optValue: string) {
    e.stopPropagation()
    if (value === optValue) onChange('')
    onDeleteOption!(optValue)
  }

  const canEdit = !!onEditOption
  const canDelete = !!onDeleteOption

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <div
        className={`${base} flex items-center justify-between cursor-pointer select-none`}
        onClick={() => { if (open) closeDropdown(); else setOpen(true) }}
      >
        <span className={value ? 'text-app-text' : 'text-app-text3'}>
          {value ? displayLabel : placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {value && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); setQuery('') }}
              className="text-app-text3 hover:text-app-text text-xs leading-none px-1"
            >
              ✕
            </button>
          )}
          <span className="text-app-text3 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-app-border rounded-xl shadow-lg overflow-hidden">
          {/* Search */}
          <div className="px-3 py-2 border-b border-app-border">
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && showCreate) { e.preventDefault(); handleCreate() } }}
              placeholder={placeholder}
              className="w-full text-sm text-app-text bg-transparent focus:outline-none placeholder:text-app-text3"
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && !showCreate && (
              <div className="px-4 py-3 text-sm text-app-text3 text-center">
                {emptyLabel ?? (query ? 'Sin resultados' : 'Lista vacía')}
              </div>
            )}

            {filtered.map((o) => (
              <div
                key={o.value}
                className={`flex items-center ${hovered === o.value && value !== o.value ? 'bg-wine-50/60' : ''}`}
                onMouseEnter={() => setHovered(o.value)}
                onMouseLeave={() => setHovered(null)}
              >
                {editingValue === o.value ? (
                  /* ── Inline edit mode ── */
                  <>
                    <input
                      autoFocus
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitEdit(o.value) }
                        if (e.key === 'Escape') setEditingValue(null)
                      }}
                      onBlur={() => commitEdit(o.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-4 py-2.5 text-sm text-app-text bg-transparent focus:outline-none min-w-0"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); commitEdit(o.value) }}
                      className="px-2 py-2.5 text-emerald-500 hover:text-emerald-700 text-sm flex-shrink-0"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setEditingValue(null) }}
                      className="px-2 py-2.5 text-app-text3 hover:text-app-text text-xs flex-shrink-0"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  /* ── Normal row ── */
                  <>
                    <button
                      type="button"
                      onClick={() => { onChange(o.value); closeDropdown() }}
                      className={`flex-1 text-left px-4 py-2.5 text-sm transition-colors min-w-0
                        ${value === o.value ? 'text-wine-600 font-semibold' : 'text-app-text'}`}
                    >
                      {o.label}
                    </button>
                    {canEdit && hovered === o.value && (
                      <button
                        type="button"
                        onClick={(e) => startEdit(e, o)}
                        title="Editar"
                        className="p-1.5 mr-0.5 rounded-md text-app-text3 hover:text-wine-600 hover:bg-wine-50 flex-shrink-0 transition-colors"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    )}
                    {canDelete && hovered === o.value && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteClick(e, o.value)}
                        title="Eliminar"
                        className="p-1.5 mr-1 rounded-md text-app-text3 hover:text-red-500 hover:bg-red-50 flex-shrink-0 transition-colors"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}

            {(allowCustom || !!onCreateOption) && (
              <button
                type="button"
                disabled={creating}
                onClick={() => {
                  if (query.trim()) { handleCreate() }
                  else { inputRef.current?.focus() }
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-wine-600 font-medium hover:bg-wine-50/60 border-t border-app-border disabled:opacity-50 transition-colors"
              >
                {creating
                  ? 'Criando…'
                  : showCreate
                    ? `+ ${createLabel ?? 'Novo'} "${query.trim()}"`
                    : `+ ${createLabel ?? 'Novo'}`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
