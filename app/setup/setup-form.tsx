'use client'

import { useActionState } from 'react'
import { setupAdmin } from './actions'

export default function SetupForm() {
  const [state, action, pending] = useActionState(setupAdmin, undefined)

  const inp = 'w-full px-3.5 py-2.5 rounded-xl border border-app-border bg-white text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-wine-500 placeholder:text-app-text3'

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden md:flex w-[420px] flex-shrink-0 bg-wine-600 flex-col justify-between p-10">
        <div>
          <div className="font-[family-name:--font-playfair] text-3xl font-bold text-white">
            Grapes <span className="text-gold-200">&</span> Nuts
          </div>
          <div className="mt-2 text-wine-200 text-sm">Sistema de Gestão · Sistema de Gestión</div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-white/80 text-sm">
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
            Crea tu cuenta de administrador
          </div>
          <div className="flex items-center gap-3 text-white/50 text-sm">
            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            Invita a tu equipo desde Configuraciones
          </div>
          <div className="flex items-center gap-3 text-white/50 text-sm">
            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            Asigna permisos a cada persona
          </div>
        </div>
        <div className="text-wine-300 text-xs">© 2026 Grapes & Nuts · KAUNE Wines</div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-app-bg">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8 text-center">
            <div className="font-[family-name:--font-playfair] text-2xl font-bold text-wine-600">
              Grapes <span className="text-gold-600">&</span> Nuts
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-wine-50 text-wine-600 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            ⚙️ Configuración inicial
          </div>
          <h1 className="text-2xl font-semibold text-app-text mb-1">Crear cuenta admin</h1>
          <p className="text-app-text3 text-sm mb-8">
            Esta es la cuenta principal del sistema. Solo se crea una vez.
          </p>

          <form action={action} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-app-text2 mb-1.5">
                Nombre completo *
              </label>
              <input id="name" name="name" type="text" required className={inp} placeholder="Paulo Ferreira" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-app-text2 mb-1.5">
                Email *
              </label>
              <input id="email" name="email" type="email" required className={inp} placeholder="paulo@grapesenuts.com.br" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-app-text2 mb-1.5">
                Contraseña * <span className="text-app-text3 font-normal">(mín. 8 caracteres)</span>
              </label>
              <input id="password" name="password" type="password" required minLength={8} className={inp} />
            </div>

            {state?.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-wine-600 hover:bg-wine-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              {pending ? 'Creando cuenta…' : 'Crear cuenta y entrar'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-app-text3">
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-wine-600 hover:underline">Iniciar sesión</a>
          </p>
        </div>
      </div>
    </div>
  )
}
