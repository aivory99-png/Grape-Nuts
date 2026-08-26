'use client'

import Link from 'next/link'
import { useState } from 'react'

type Lang = 'es' | 'pt'

type PanelStep = {
  title: { es: string; pt: string }
  desc:  { es: string; pt: string }
  actions: { label: { es: string; pt: string }; href: string }[]
}

const STEPS: PanelStep[] = [
  {
    title:   { es: 'Completa tu perfil',             pt: 'Complete seu perfil' },
    desc:    {
      es: 'Ve a Ajustes y configura tu nombre, elige el idioma de la app (Español o Portugués) y selecciona tu Vendedor/a predeterminado/a. Esta información se usa en toda la plataforma.',
      pt: 'Vá a Configurações e configure seu nome, escolha o idioma da app (Português ou Espanhol) e selecione o seu Vendedor/a padrão. Esta informação é usada em toda a plataforma.',
    },
    actions: [{ label: { es: '→ Ir a Ajustes', pt: '→ Ir a Configurações' }, href: '/dashboard/configuracoes' }],
  },
  {
    title:   { es: 'Agrega tus vinos al Stock',      pt: 'Adicione seus vinhos ao Estoque' },
    desc:    {
      es: 'Antes de registrar ventas necesitas tener productos. Ve a Stock y haz clic en "+ Agregar al Stock". Rellena el nombre del vino, cosecha, tipo, precio de compra, precio de lista y cantidad. Guarda con "Guardar entrada".',
      pt: 'Antes de registrar vendas você precisa ter produtos. Vá ao Estoque e clique em "+ Adicionar ao Estoque". Preencha o nome do vinho, safra, tipo, preço de compra, preço de lista e quantidade. Salve com "Salvar entrada".',
    },
    actions: [{ label: { es: '→ Ir al Stock', pt: '→ Ir ao Estoque' }, href: '/dashboard/estoque' }],
  },
  {
    title:   { es: 'Crea tus primeros Clientes',     pt: 'Crie seus primeiros Clientes' },
    desc:    {
      es: 'Ve a Clientes y haz clic en "+ Nuevo Cliente". Añade el nombre, ciudad, tipo de cliente y el Vendedor/a responsable. Puedes marcar un cliente como Prospecto si aún no ha comprado.',
      pt: 'Vá a Clientes e clique em "+ Novo Cliente". Adicione o nome, cidade, tipo de cliente e o Vendedor/a responsável. Você pode marcar um cliente como Prospect se ainda não comprou.',
    },
    actions: [{ label: { es: '→ Ir a Clientes', pt: '→ Ir a Clientes' }, href: '/dashboard/clientes' }],
  },
  {
    title:   { es: 'Registra tu primera venta',      pt: 'Registre sua primeira venda' },
    desc:    {
      es: 'Haz clic en "Nuevo Pedido" en el menú. Selecciona el Cliente, el Vendedor/a responsable y añade los Vinos con sus cantidades — el precio de lista se rellena solo. Elige el Tipo y Plazo de pago y confirma con "Registrar Pedido".',
      pt: 'Clique em "Novo Pedido" no menu. Selecione o Cliente, o Vendedor/a responsável e adicione os Vinhos com suas quantidades — o preço de lista é preenchido automaticamente. Escolha o Tipo e Prazo de pagamento e confirme com "Registrar Pedido".',
    },
    actions: [{ label: { es: '→ Nuevo Pedido', pt: '→ Novo Pedido' }, href: '/dashboard/vendas' }],
  },
  {
    title:   { es: 'Sigue tus Finanzas',             pt: 'Acompanhe suas Finanças' },
    desc:    {
      es: 'En el Panel de Gestión verás el gráfico de ingresos por mes, los KPIs de Ingresos del mes, Stock total y clientes activos, y la tabla de Pedidos Recientes. Haz clic en una barra del gráfico para filtrar todo por ese mes.',
      pt: 'No Painel de Gestão você verá o gráfico de receita por mês, os KPIs de Receita do mês, Estoque total e clientes ativos, e a tabela de Pedidos Recentes. Clique em uma barra do gráfico para filtrar tudo por aquele mês.',
    },
    actions: [{ label: { es: '→ Ver Finanzas', pt: '→ Ver Financeiro' }, href: '/dashboard' }],
  },
  {
    title:   { es: 'Gestiona Cobros y envíos',       pt: 'Gerencie Cobranças e envios' },
    desc:    {
      es: 'En Cobros verás todos tus pedidos organizados por estado — Vencidos, Por vencer y Recibidos. Expande un pedido con la flecha para registrar el envío (empresa y código de seguimiento), marcar como Enviado, y marcar cobros como Pagado.',
      pt: 'Em Cobranças você verá todos os seus pedidos organizados por estado — Vencidas, A vencer e Recebidas. Expanda um pedido com a seta para registrar o envio (empresa e código de rastreio), marcar como Enviado, e marcar cobranças como Pago.',
    },
    actions: [{ label: { es: '→ Ir a Cobros', pt: '→ Ir a Cobranças' }, href: '/dashboard/cobrancas' }],
  },
]

const UI = {
  title:    { es: 'PRIMEROS PASOS',  pt: 'PRIMEIROS PASSOS' },
  heading:  { es: 'Cómo empezar a usar la plataforma', pt: 'Como começar a usar a plataforma' },
  sub:      { es: 'Sigue estos pasos para configurar tu cuenta.',   pt: 'Siga estes passos para configurar a sua conta.' },
  done:     { es: '¡Todo listo, a trabajar!', pt: 'Tudo pronto, vamos trabalhar!' },
}

function CheckIcon({ done }: { done: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className={done ? 'text-emerald-500' : 'text-app-border'}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function GettingStartedPanel({
  open,
  onClose,
  lang,
}: {
  open: boolean
  onClose: () => void
  lang: Lang
}) {
  const [done, setDone] = useState<Record<number, boolean>>({})

  if (!open) return null

  const L = lang

  return (
    <>
      {/* Dim overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        style={{ backdropFilter: 'blur(1px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed top-0 right-0 bottom-0 z-50 w-80 bg-app-card border-l border-app-border flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-app-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold tracking-[0.15em] text-app-text3 uppercase">
              {UI.title[L]}
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-app-text3 hover:text-app-text hover:bg-app-bg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <h2 className="text-app-text font-bold text-base leading-snug">{UI.heading[L]}</h2>
          <p className="text-app-text3 text-xs mt-1">{UI.sub[L]}</p>
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto py-4">
          {STEPS.map((s, i) => {
            const isDone = !!done[i]
            return (
              <div
                key={i}
                className={`mx-3 mb-2 rounded-xl border transition-colors ${
                  isDone ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-app-border bg-app-bg'
                }`}
              >
                <button
                  className="w-full flex items-start gap-3 px-4 py-3 text-left"
                  onClick={() => setDone(d => ({ ...d, [i]: !d[i] }))}
                >
                  {/* Step number / check */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold transition-colors ${
                    isDone ? 'bg-emerald-500 text-white' : 'bg-app-border text-app-text3'
                  }`}>
                    {isDone
                      ? <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : i + 1
                    }
                  </div>
                  <span className={`text-sm font-semibold leading-snug ${isDone ? 'text-app-text3 line-through' : 'text-app-text'}`}>
                    {s.title[L]}
                  </span>
                </button>

                {/* Expanded content when not done */}
                {!isDone && (
                  <div className="px-4 pb-4 pl-13" style={{ paddingLeft: '3.25rem' }}>
                    <p className="text-xs text-app-text2 leading-relaxed mb-3">{s.desc[L]}</p>
                    {s.actions.map((a, j) => (
                      <Link
                        key={j}
                        href={a.href}
                        onClick={onClose}
                        className="inline-block text-xs font-semibold text-wine-600 hover:text-wine-700 hover:underline transition-colors"
                      >
                        {a.label[L]}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer CTA */}
        <div className="px-4 py-4 border-t border-app-border flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-wine-600 hover:bg-wine-700 text-white text-sm font-semibold transition-colors"
          >
            {UI.done[L]}
          </button>
        </div>
      </aside>
    </>
  )
}
