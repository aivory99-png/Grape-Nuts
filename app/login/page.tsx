'use client'

import { Suspense, useActionState, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from './actions'
import Image from 'next/image'

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

function CreatedBanner() {
  const params = useSearchParams()
  if (params.get('created') !== '1') return null
  return (
    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-4">
      <div className="font-semibold mb-0.5">¡Cuenta creada!</div>
      Revisa tu email para confirmar la cuenta y luego inicia sesión.
    </div>
  )
}

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)
  const [showPwd, setShowPwd] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (state?.success) router.push('/dashboard')
  }, [state, router])

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl border border-app-border bg-white text-app-text text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-wine-500 placeholder:text-app-text3'

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden md:flex w-[420px] flex-shrink-0 bg-zinc-950 flex-col justify-between p-10">
        <div>
          <Image src="/logo.webp" alt="Grapes & Nuts" width={200} height={70} className="object-contain" />
          <div className="mt-3 text-zinc-400 text-sm">Sistema de Gestión</div>
        </div>
        <div>
          <blockquote className="text-zinc-400 text-sm italic leading-relaxed">
            &ldquo;Muito de qualquer coisa é ruim, mas muito champanhe é ótimo.&rdquo;
          </blockquote>
          <div className="mt-2 text-zinc-500 text-xs">— Scott Fitzgerald</div>
        </div>
        <div className="text-zinc-600 text-xs">© 2026 Grapes & Nuts · KAUNE Wines</div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-app-bg">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="md:hidden mb-8 flex justify-center">
            <div className="bg-zinc-950 rounded-2xl px-5 py-3">
              <Image src="/logo.webp" alt="Grapes & Nuts" width={150} height={52} className="object-contain" />
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-app-text mb-1">Entrar / Iniciar sesión</h1>
          <p className="text-app-text3 text-sm mb-6">Acesse o painel de gestão · Accede al panel de gestión</p>

          <Suspense>
            <CreatedBanner />
          </Suspense>

          <form action={action} autoComplete="on" className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-app-text2 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputCls}
                placeholder="paulo@grapesenuts.com.br"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-app-text2">
                  Senha / Contraseña
                </label>
                <Link href="/forgot-password" className="text-xs text-wine-600 hover:underline">
                  Olvidé mi contraseña
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={inputCls + ' pr-10'}
                />
                <button
                  type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text3 hover:text-app-text transition-colors"
                  tabIndex={-1}
                >
                  <EyeIcon open={showPwd} />
                </button>
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
              {pending ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-app-text3">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-wine-600 font-medium hover:underline">
              Registrarse
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
