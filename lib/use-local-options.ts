'use client'

import { useState, useCallback, useEffect } from 'react'

type Option = { value: string; label: string }

export function useLocalOptions(key: string, defaults: Option[]) {
  const storageKey = `gn_opts_${key}`

  const [opts, setOpts] = useState<Option[]>(() => {
    if (typeof window === 'undefined') return defaults
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Option[]
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return defaults
  })

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(opts)) } catch {}
  }, [opts, storageKey])

  const addOption = useCallback(async (label: string): Promise<Option | void> => {
    const value = label.trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 50)
    if (!value) return
    const opt: Option = { value, label: label.trim() }
    setOpts((prev) => {
      if (prev.some((o) => o.value === value)) return prev
      return [...prev, opt]
    })
    return opt
  }, [])

  const deleteOption = useCallback((value: string) => {
    setOpts((prev) => prev.filter((o) => o.value !== value))
  }, [])

  const editOption = useCallback((_value: string, newLabel: string) => {
    setOpts((prev) => prev.map((o) => o.value === _value ? { value: o.value, label: newLabel.trim() } : o))
  }, [])

  const resetToDefaults = useCallback(() => {
    setOpts(defaults)
    try { localStorage.removeItem(storageKey) } catch {}
  }, [defaults, storageKey])

  return { opts, addOption, deleteOption, editOption, resetToDefaults }
}
