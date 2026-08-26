'use client'

import { useActionState, useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import { updatePassword } from '../login/actions'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function UpdatePasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, undefined)
  const [ready, setReady] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    // Supabase sends tokens in the URL hash after email reset link click.
    // We need to exchange them for a session before the form is usable.
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      const params = new URLSearchParams(hash.slice(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
          if (error) setInitError(error.message)
          else setReady(true)
        })
      } else {
        Promise.resolve().then(() => setInitError('Enlace inválido o expirado.'))
      }
    } else {
      // User might already have a session (navigated here directly)
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) setReady(true)
        else setInitError('Enlace inválido o expirado. Solicita uno nuevo.')
      })
    }
  }, [])

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl border border-app-border bg-white text-app-text text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-wine-500 placeholder:text-app-text3'

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex w-[420px] flex-shrink-0 bg-zinc-950 flex-col justify-between p-10">
        <div>
          <Image src="/logo.webp" alt="Grapes & Nuts" width={200} height={70} className="object-contain" />
          <div className="mt-3 text-zinc-400 text-sm">Sistema de Gestión</div>
        </div>
        <blockquote className="text-zinc-400 text-sm italic leading-relaxed">
          &ldquo;El vino es la respuesta. ¿Cuál era la pregunta?&rdquo;
        </blockquote>
        <div className="text-zinc-600 text-xs">© 2026 Grapes & Nuts · KAUNE Wines</div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-app-bg">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8 flex justify-center">
            <div className="bg-zinc-950 rounded-2xl px-5 py-3">
              <Image src="/logo.webp" alt="Grapes & Nuts" width={150} height={52} className="object-contain" />
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-app-text mb-1">Nueva contraseña</h1>
          <p className="text-app-text3 text-sm mb-6">Elige una nueva contraseña para tu cuenta.</p>

          {initError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {initError}
              <div className="mt-2">
                <a href="/forgot-password" className="text-wine-600 font-medium hover:underline">
                  Solicitar nuevo enlace →
                </a>
              </div>
            </div>
          ) : !ready ? (
            <div className="text-app-text3 text-sm">Verificando enlace…</div>
          ) : (
            <form action={action} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-app-text2 mb-1.5">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    id="password" name="password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="new-password" required minLength={6}
                    className={inputCls + ' pr-10'}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text3 hover:text-app-text transition-colors"
                    tabIndex={-1}><EyeIcon open={showPwd} /></button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-app-text2 mb-1.5">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="confirm" name="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password" required
                    className={inputCls + ' pr-10'}
                    placeholder="Repite la contraseña"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text3 hover:text-app-text transition-colors"
                    tabIndex={-1}><EyeIcon open={showConfirm} /></button>
                </div>
              </div>

              {state?.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {state.error}
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full bg-wine-600 hover:bg-wine-700 disabled:opacity-60 text-white font-semibold
                  py-2.5 px-4 rounded-xl text-sm transition-colors"
              >
                {pending ? 'Guardando…' : 'Guardar nueva contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
