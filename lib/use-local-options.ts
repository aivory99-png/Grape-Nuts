'use client'

import { useState, useCallback } from 'react'

type Option = { value: string; label: string }

export function useLocalOptions(key: string, defaults: Option[]) {
  const [opts, setOpts] = useState<Option[]>(defaults)

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

  return { opts, addOption, deleteOption, editOption }
}
