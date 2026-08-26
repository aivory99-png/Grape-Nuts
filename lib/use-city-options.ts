'use client'
import { useState, useCallback } from 'react'

type Option = { value: string; label: string }

export function useStringOptions(serverValues: string[]) {
  const [opts, setOpts] = useState<Option[]>(
    () => serverValues.filter(Boolean).map(c => ({ value: c, label: c }))
  )

  const addOption = useCallback(async (label: string): Promise<Option | void> => {
    const trimmed = label.trim()
    if (!trimmed) return
    const opt: Option = { value: trimmed, label: trimmed }
    setOpts(prev => {
      if (prev.some(o => o.value.toLowerCase() === trimmed.toLowerCase())) return prev
      return [...prev, opt]
    })
    return opt
  }, [])

  const deleteOption = useCallback((value: string) => {
    setOpts(prev => prev.filter(o => o.value !== value))
  }, [])

  const editOption = useCallback((oldValue: string, newLabel: string) => {
    const newValue = newLabel.trim()
    if (!newValue) return
    setOpts(prev => prev.map(o => o.value === oldValue ? { value: newValue, label: newValue } : o))
    return newValue
  }, [])

  return { opts, addOption, deleteOption, editOption }
}

export function useCityOptions(serverCities: string[]) {
  return useStringOptions(serverCities)
}
