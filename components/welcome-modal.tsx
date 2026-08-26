'use client'

import { useState, useEffect } from 'react'
import GrapesNutsLogo from '@/components/logo'

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
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(storageKey(userId))) {
      const t = setTimeout(() => setVisible(true), 400)
      return () => clearTimeout(t)
    }
  }, [userId])

  function dismiss(startTour = false) {
    setLeaving(true)
    if (typeof window !== 'undefined') localStorage.setItem(storageKey(userId), '1')
    onDismiss?.()
    setTimeout(() => {
      setVisible(false)
      setLeaving(false)
      if (startTour) onStartTour()
    }, 350)
  }

  if (!visible) return null

  const firstName = userName?.split(' ')[0] ?? 'Paulo'

  return (
    <div
      className={`fixed inset-0 z-[9998] flex items-center justify-center p-4 transition-opacity duration-300 ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className={`w-full max-w-md bg-app-card rounded-3xl shadow-2xl overflow-hidden transition-all duration-350 ${leaving ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
      >
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-wine-900 via-wine-800 to-wine-700 px-8 pt-10 pb-8 text-center relative overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />

          <div className="relative">
            <div className="flex justify-center mb-5">
              <div className="bg-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
                <GrapesNutsLogo size="md" />
              </div>
            </div>
            <h2 className="text-white text-2xl font-bold mb-1">
              Olá, {firstName}! 🍇
            </h2>
            <p className="text-wine-200 text-sm">
              Bem-vindo ao Grape&Nuts
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-7 space-y-5">
          {/* Main message */}
          <div className="space-y-3">
            <p className="text-app-text text-sm leading-relaxed">
              Sabemos que mudar de ferramenta pode parecer desafiador — especialmente vindo do Excel.
            </p>
            <div className="bg-wine-50 dark:bg-wine-900/20 border border-wine-100 dark:border-wine-800/40 rounded-2xl px-4 py-3.5">
              <p className="text-wine-700 dark:text-wine-300 text-sm font-medium leading-relaxed">
                Calma — preparamos tudo para você. Os seus vinhos, clientes e dados já estão aqui, prontos a usar.
              </p>
            </div>
            <p className="text-app-text2 text-sm leading-relaxed">
              Em poucos minutos você vai se sentir em casa. E quando precisar, a equipa DeTech está sempre disponível.
            </p>
          </div>

          {/* Steps preview */}
          <div className="flex items-center gap-3 py-1">
            {['Estoque', 'Vendas', 'Cobranças', 'Finanças'].map((label, i) => (
              <div key={i} className="flex-1 text-center">
                <div className="w-7 h-7 rounded-full bg-wine-100 dark:bg-wine-900/40 text-wine-600 dark:text-wine-300 text-xs font-bold flex items-center justify-center mx-auto mb-1">
                  {i + 1}
                </div>
                <p className="text-[10px] text-app-text3 font-medium leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => dismiss(true)}
              className="w-full py-3.5 rounded-2xl bg-wine-600 hover:bg-wine-700 active:bg-wine-800 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              Ver o tour da plataforma →
            </button>
            <button
              onClick={() => dismiss(false)}
              className="w-full py-2.5 rounded-2xl text-app-text3 hover:text-app-text text-sm transition-colors"
            >
              Explorar por conta própria
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-[11px] text-app-text3">
            Desenvolvido com cuidado pela equipa{' '}
            <span className="font-semibold text-app-text2">DeTech</span>
          </p>
        </div>
      </div>
    </div>
  )
}
