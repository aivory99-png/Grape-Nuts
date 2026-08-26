'use client'

import { useState, useEffect } from 'react'
import GrapesNutsLogo from '@/components/logo'
import { createClient } from '@/lib/supabase/client'

const storageKey = (userId?: string) => `gn_welcome_v1_${userId ?? 'anon'}`

export default function WelcomeModal({
  userId,
  userName,
  onStartTour,
  onDismiss,
}: {
  userId?: string
  userName?: string
  onStartTour: () => void
  onDismiss?: () => void
}) {
  const [visible,     setVisible]     = useState(false)
  const [leaving,     setLeaving]     = useState(false)
  const [wineCount,   setWineCount]   = useState<number | null>(null)
  const [clientCount, setClientCount] = useState<number | null>(null)

  /* show only if not seen yet */
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(storageKey(userId))) {
      const t = setTimeout(() => setVisible(true), 500)
      return () => clearTimeout(t)
    }
  }, [userId])

  /* fetch real stats when modal becomes visible */
  useEffect(() => {
    if (!visible) return
    const sb = createClient()
    Promise.all([
      sb.from('wines').select('id', { count: 'exact', head: true }),
      sb.from('clients').select('id', { count: 'exact', head: true }),
    ]).then(([w, c]) => {
      if (w.count != null) setWineCount(w.count)
      if (c.count != null) setClientCount(c.count)
    })
  }, [visible])

  function dismiss(startTour = false) {
    setLeaving(true)
    if (typeof window !== 'undefined') localStorage.setItem(storageKey(userId), '1')
    onDismiss?.()
    setTimeout(() => {
      setVisible(false)
      setLeaving(false)
      if (startTour) onStartTour()
    }, 320)
  }

  if (!visible) return null

  const firstName = userName?.split(' ')[0] ?? 'Paulo'

  return (
    <div
      className={`fixed inset-0 z-[9998] flex items-center justify-center p-4 transition-opacity duration-300 ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'rgba(10,5,18,0.82)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className={`w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden transition-all duration-320 ${leaving ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
        style={{ background: 'var(--color-app-card, #fff)' }}
      >
        {/* ── Header ── */}
        <div
          className="relative px-8 pt-10 pb-9 text-center overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #1a0a24 0%, #3b0f2f 45%, #7c1d45 100%)' }}
        >
          {/* Decorative blobs */}
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #c2185b, transparent)' }} />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #9c27b0, transparent)' }} />

          {/* Logo */}
          <div className="relative flex justify-center mb-5">
            <div style={{ mixBlendMode: 'lighten' }}>
              <GrapesNutsLogo size="md" />
            </div>
          </div>

          {/* Greeting */}
          <h2 className="text-white text-2xl font-bold mb-1 relative">
            Olá, {firstName}! 🍇
          </h2>
          <p className="text-sm relative" style={{ color: 'rgba(255,255,255,0.55)' }}>
            A sua plataforma está pronta
          </p>
        </div>

        {/* ── Body ── */}
        <div className="px-7 pt-6 pb-2 space-y-4">

          {/* Personal message */}
          <p className="text-sm leading-relaxed text-app-text">
            Sabemos que mudar do Excel pode parecer um salto grande —
            mas a equipe da <span className="font-semibold text-app-text">DeTech</span> preparou
            tudo com cuidado para que você se sinta em casa desde o primeiro clique.
          </p>

          {/* Data ready callout */}
          <div
            className="rounded-2xl px-4 py-4 flex items-center gap-4"
            style={{ background: 'rgba(159,18,57,0.07)', border: '1px solid rgba(159,18,57,0.15)' }}
          >
            <div className="flex-1 space-y-1.5">
              {wineCount != null ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🍷</span>
                  <span className="text-sm font-semibold text-app-text">
                    {wineCount} {wineCount === 1 ? 'vinho carregado' : 'vinhos carregados'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🍷</span>
                  <span className="text-sm font-semibold text-app-text">Vinhos carregados</span>
                </div>
              )}
              {clientCount != null ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤝</span>
                  <span className="text-sm font-semibold text-app-text">
                    {clientCount} {clientCount === 1 ? 'cliente registado' : 'clientes registados'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤝</span>
                  <span className="text-sm font-semibold text-app-text">Clientes registados</span>
                </div>
              )}
            </div>
            <div className="flex-shrink-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(159,18,57,0.12)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9f1239" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-app-text2">
            O tour abaixo mostra cada parte da plataforma em menos de 3 minutos,
            com os seus próprios dados como exemplo.
          </p>
        </div>

        {/* ── Actions ── */}
        <div className="px-7 pb-6 pt-4 space-y-2">
          <button
            onClick={() => dismiss(true)}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold transition-all shadow-md active:scale-[.98]"
            style={{ background: 'linear-gradient(135deg, #9f1239 0%, #be123c 100%)' }}
          >
            Ver o tour da plataforma →
          </button>
          <button
            onClick={() => dismiss(false)}
            className="w-full py-2.5 rounded-2xl text-sm transition-colors text-app-text3 hover:text-app-text"
          >
            Explorar por conta própria
          </button>
        </div>

        {/* ── Footer ── */}
        <div className="px-7 pb-6 text-center">
          <p className="text-[11px] text-app-text3 leading-relaxed">
            Feito com cuidado pelo time da{' '}
            <span className="font-semibold text-app-text2">DeTech</span>
            {' '}para o <span className="font-medium text-app-text2">Grape&Nuts</span>
          </p>
        </div>
      </div>
    </div>
  )
}
