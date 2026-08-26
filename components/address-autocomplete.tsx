'use client'

import { useEffect, useRef, useState } from 'react'

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

declare global {
  // eslint-disable-next-line no-var
  var google: {
    maps: {
      places: {
        Autocomplete: new (
          input: HTMLInputElement,
          opts?: { types?: string[]; fields?: string[] }
        ) => {
          addListener: (event: string, cb: () => void) => void
          getPlace: () => { formatted_address?: string; name?: string }
        }
      }
    }
  }
  interface Window {
    google: typeof globalThis.google
    _mapsLoaded?: boolean
    _mapsCallbacks?: Array<() => void>
  }
}

function loadMapsScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window._mapsLoaded) { resolve(); return }
    if (window._mapsCallbacks) { window._mapsCallbacks.push(resolve); return }
    window._mapsCallbacks = [resolve]
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&loading=async`
    script.async = true
    script.onload = () => {
      window._mapsLoaded = true
      window._mapsCallbacks?.forEach(cb => cb())
      window._mapsCallbacks = []
    }
    document.head.appendChild(script)
  })
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function AddressAutocomplete({ value, onChange, placeholder, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const acRef = useRef<{ addListener: (e: string, cb: () => void) => void; getPlace: () => { formatted_address?: string; name?: string } } | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!MAPS_KEY) return
    loadMapsScript().then(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready || !inputRef.current || acRef.current) return

    acRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      fields: ['formatted_address', 'name'],
    })

    acRef.current.addListener('place_changed', () => {
      const place = acRef.current!.getPlace()
      const address = place.formatted_address || place.name || ''
      onChange(address)
    })
  }, [ready, onChange])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {MAPS_KEY && !ready && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-app-text3">
          ↻
        </span>
      )}
    </div>
  )
}
