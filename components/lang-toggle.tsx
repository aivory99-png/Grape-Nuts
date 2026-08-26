'use client'

import { useTransition } from 'react'
import { setLangAction } from '@/app/actions/lang'
import type { Lang } from '@/lib/i18n'

export default function LangToggle({ current }: { current: Lang }) {
  const [, start] = useTransition()

  function toggle() {
    const next: Lang = current === 'pt' ? 'es' : 'pt'
    start(async () => {
      await setLangAction(next)
    })
  }

  return (
    <button
      onClick={toggle}
      title="Mudar idioma / Cambiar idioma"
      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-app-text2 hover:bg-app-bg transition-all w-full"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
      <span className="flex-1 text-left flex items-center gap-1.5">
        <span className={`font-semibold text-xs px-1.5 py-0.5 rounded ${
          current === 'es' ? 'bg-wine-600 text-white' : 'text-app-text3'
        }`}>ES</span>
        <span className="text-app-border text-xs">/</span>
        <span className={`font-semibold text-xs px-1.5 py-0.5 rounded ${
          current === 'pt' ? 'bg-wine-600 text-white' : 'text-app-text3'
        }`}>PT</span>
      </span>
    </button>
  )
}
