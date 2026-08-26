'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'brand:logo'
const SIZES = { sm: { w: 120, h: 42 }, md: { w: 166, h: 58 }, lg: { w: 240, h: 84 } }

function FallbackSvg({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const scales = { sm: 0.72, md: 1, lg: 1.45 }
  const s = scales[size]
  const c = '#d4607a'
  return (
    <svg
      viewBox="0 0 200 70"
      width={Math.round(200 * s)}
      height={Math.round(70 * s)}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Grapes & Nuts"
    >
      <text x="4" y="43" fontFamily="'Great Vibes', 'Brush Script MT', cursive" fontSize="37" fill={c} letterSpacing="0.3">Grapes</text>
      <text x="9" y="63" fontFamily="'Great Vibes', 'Brush Script MT', cursive" fontSize="24" fill={c} letterSpacing="0.2">&amp; Nuts</text>
      <g stroke={c} strokeWidth="1.25" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="158" y1="8" x2="191" y2="8" />
        <path d="M 158 8 C 151 21 154 43 174 52" />
        <path d="M 191 8 C 198 21 195 43 174 52" />
        <line x1="174" y1="52" x2="174" y2="64" />
        <line x1="163" y1="64" x2="185" y2="64" />
      </g>
    </svg>
  )
}

export default function GrapesNutsLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { w, h } = SIZES[size]
  const [src, setSrc] = useState('/logo.webp')
  const [error, setError] = useState(false)

  useEffect(() => {
    function load() {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) { setSrc(stored); setError(false) }
    }
    load()
    window.addEventListener('brand:logo-changed', load)
    return () => window.removeEventListener('brand:logo-changed', load)
  }, [])

  if (error) return <FallbackSvg size={size} />

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Grapes & Nuts"
      width={w}
      height={h}
      style={{ objectFit: 'contain', objectPosition: 'center', maxHeight: h, maxWidth: '100%' }}
      onError={() => setError(true)}
    />
  )
}
