'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Lang } from '@/lib/i18n'
import { deleteOrder } from './actions'

interface Order {
  id: string
  client_id: string
  order_date: string
  total_revenue: number
  status: string
  clients?: { name: string }[] | null
  user_profiles?: { name: string }[] | null
}

export default function SalesListClient({ orders, lang }: { orders: Order[]; lang: Lang }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(orderId: string) {
    setDeletingId(orderId)
    setError(null)
    const result = await deleteOrder(orderId)
    setDeletingId(null)
    if (result.error) {
      setError(result.error)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(null)
      router.refresh()
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat(lang === 'pt' ? 'pt-PT' : 'es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(n)

  return (
    <div>
      <h2 className="text-lg font-semibold text-app-text mb-4">{lang === 'pt' ? 'Pedidos' : 'Pedidos'}</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <p className="text-sm text-app-text3">{lang === 'pt' ? 'Nenhum pedido ainda.' : 'Sin pedidos aún.'}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-app-border">
                <th className="text-left p-3 font-semibold text-app-text text-xs">{lang === 'pt' ? 'Data' : 'Fecha'}</th>
                <th className="text-left p-3 font-semibold text-app-text text-xs">{lang === 'pt' ? 'Cliente' : 'Cliente'}</th>
                <th className="text-left p-3 font-semibold text-app-text text-xs">{lang === 'pt' ? 'Vendedor' : 'Vendedor'}</th>
                <th className="text-right p-3 font-semibold text-app-text text-xs">{lang === 'pt' ? 'Total' : 'Total'}</th>
                <th className="text-center p-3 font-semibold text-app-text text-xs">{lang === 'pt' ? 'Status' : 'Estado'}</th>
                <th className="text-center p-3 font-semibold text-app-text text-xs">{lang === 'pt' ? 'Ações' : 'Acciones'}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-app-border hover:bg-app-bg/50 transition-colors">
                  <td className="p-3 text-app-text">{new Date(order.order_date).toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'es-ES')}</td>
                  <td className="p-3 text-app-text">{order.clients?.[0]?.name || '—'}</td>
                  <td className="p-3 text-app-text">{order.user_profiles?.[0]?.name || '—'}</td>
                  <td className="p-3 text-app-text text-right font-semibold">{fmt(order.total_revenue)}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      order.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {order.status === 'open' ? (lang === 'pt' ? 'Aberta' : 'Abierta') : (lang === 'pt' ? 'Fechada' : 'Cerrada')}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {confirmDeleteId === order.id ? (
                      <div className="flex gap-1 justify-center items-center">
                        <span className="text-xs text-red-500">{lang === 'pt' ? 'Tem certeza?' : '¿Seguro?'}</span>
                        <button
                          onClick={() => handleDelete(order.id)}
                          disabled={deletingId === order.id}
                          className="text-xs font-bold bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-2 py-1 rounded"
                        >
                          {deletingId === order.id ? '…' : '✓'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-app-text3 px-1 py-1"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(order.id)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
                      >
                        {lang === 'pt' ? 'Excluir' : 'Eliminar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
