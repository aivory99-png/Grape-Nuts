'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard-error]', error.digest ?? error.message)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12">
      <h2 className="text-base font-semibold text-app-text">Erro ao carregar a página. / Error al cargar la página.</h2>
      <button
        onClick={reset}
        className="px-4 py-2 bg-wine-600 text-white rounded-xl text-sm hover:bg-wine-700 transition-colors"
      >
        Tentar novamente / Intentar de nuevo
      </button>
    </div>
  )
}
