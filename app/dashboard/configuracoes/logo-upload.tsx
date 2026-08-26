'use client'

import { useRef, useState, useEffect } from 'react'
import type { Lang } from '@/lib/i18n'

const STORAGE_KEY = 'brand:logo'
const MAX_BYTES = 600_000 // ~600 KB after base64

export default function LogoUpload({ lang }: { lang: Lang }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setPreview(stored)
  }, [])

  function handleFile(file: File) {
    setError('')
    if (!file.type.startsWith('image/')) {
      setError(lang === 'pt' ? 'Arquivo inválido. Use PNG, JPG ou SVG.' : 'Archivo inválido. Usa PNG, JPG o SVG.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result as string
      if (data.length > MAX_BYTES) {
        setError(lang === 'pt' ? 'Imagem muito grande (máx. 450 KB).' : 'Imagen muy grande (máx. 450 KB).')
        return
      }
      localStorage.setItem(STORAGE_KEY, data)
      setPreview(data)
      // Refresh so nav-shell re-renders with new logo
      window.dispatchEvent(new Event('brand:logo-changed'))
    }
    reader.readAsDataURL(file)
  }

  function handleRemove() {
    localStorage.removeItem(STORAGE_KEY)
    setPreview(null)
    window.dispatchEvent(new Event('brand:logo-changed'))
  }

  return (
    <div className="bg-white rounded-2xl border border-app-border p-5 space-y-4">
      <h2 className="text-sm font-semibold text-app-text">
        {lang === 'pt' ? 'Logo da empresa' : 'Logo de la empresa'}
      </h2>

      {/* Preview */}
      <div className="flex items-center gap-4">
        <div className="w-28 h-16 rounded-xl border border-app-border bg-app-bg flex items-center justify-center overflow-hidden flex-shrink-0">
          {preview
            ? <img src={preview} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
            : <span className="text-xs text-app-text3">{lang === 'pt' ? 'Sem logo' : 'Sin logo'}</span>
          }
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="block text-xs font-semibold text-white bg-wine-600 hover:bg-wine-700 px-4 py-2 rounded-xl transition-colors"
          >
            {preview
              ? (lang === 'pt' ? 'Trocar logo' : 'Cambiar logo')
              : (lang === 'pt' ? 'Fazer upload' : 'Subir logo')}
          </button>
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              className="block text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              {lang === 'pt' ? 'Remover' : 'Eliminar'}
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <p className="text-[11px] text-app-text3">
        {lang === 'pt'
          ? 'PNG, JPG ou WebP · máx. 450 KB · aparece na barra lateral'
          : 'PNG, JPG o WebP · máx. 450 KB · aparece en la barra lateral'}
      </p>
    </div>
  )
}
