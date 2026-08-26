'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { resetPassword } from '../login/actions'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(resetPassword, undefined)

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
        <blockquote className="text-zinc-400 text-sm italic leading-relaxed">
          &ldquo;El vino es la respuesta. ¿Cuál era la pregunta?&rdquo;
        </blockquote>
        <div className="text-zinc-600 text-xs">© 2026 Grapes & Nuts · KAUNE Wines</div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-app-bg">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8 flex justify-center">
            <div className="bg-zinc-950 rounded-2xl px-5 py-3">
              <Image src="/logo.webp" alt="Grapes & Nuts" width={150} height={52} className="object-contain" />
            </div>
          </div>

          {state?.success ? (
            <div>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600 text-xl">
                ✉️
              </div>
              <h1 className="text-2xl font-semibold text-app-text mb-2">Revisa tu email</h1>
              <p className="text-app-text3 text-sm mb-6">
                Te hemos enviado un enlace para restablecer tu contraseña. Puede tardar unos minutos.
              </p>
              <Link href="/login" className="text-wine-600 font-medium hover:underline text-sm">
                ← Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-app-text mb-1">Olvidé mi contraseña</h1>
              <p className="text-app-text3 text-sm mb-6">
                Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              <form action={action} className="space-y-4">
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
                    placeholder="tu@email.com"
                  />
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
                  {pending ? 'Enviando…' : 'Enviar enlace'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-app-text3">
                <Link href="/login" className="text-wine-600 font-medium hover:underline">
                  ← Volver al inicio de sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
