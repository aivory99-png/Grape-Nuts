'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app-error]', error.digest ?? error.message)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-app-bg">
      <h2 className="text-lg font-semibold text-app-text">Algo deu errado. / Algo salió mal.</h2>
      <button
        onClick={reset}
        className="px-4 py-2 bg-wine-600 text-white rounded-xl text-sm hover:bg-wine-700 transition-colors"
      >
        Tentar novamente / Intentar de nuevo
      </button>
    </div>
  )
}
