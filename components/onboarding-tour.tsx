'use client'

import { useState, useEffect, useCallback } from 'react'
import GrapesNutsLogo from '@/components/logo'

const storageKey = (userId?: string) => `gn_tour_seen_v1_${userId ?? 'anon'}`

type Lang = 'es' | 'pt'

/* ── Shared icon component (same style as nav-shell) ── */
function Icon({ d, size = 32 }: { d: string | string[]; size?: number }) {
  const paths = Array.isArray(d) ? d : [d]
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

const ICONS = {
  chart:    ['M18 20V10', 'M12 20V4', 'M6 20v-6'],
  clients:  ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75'],
  stock:    ['M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z', 'M3.27 6.96L12 12.01l8.73-5.05', 'M12 22.08V12'],
  cart:     ['M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 01-8 0'],
  payment:  ['M12 1v22', 'M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'],
  settings: ['M12 15a3 3 0 100-6 3 3 0 000 6z', 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'],
  close:    ['M18 6L6 18', 'M6 6l12 12'],
}

type Step = {
  icon: keyof typeof ICONS
  title: { es: string; pt: string }
  subtitle: { es: string; pt: string }
  body: { es: string; pt: string }
  color: string
  iconBg: string
  dot: string
  tips: { es: string; pt: string }[]
}

const STEPS: Step[] = [
  {
    icon: 'chart',
    title:    { es: 'Finanzas',                      pt: 'Financeiro' },
    subtitle: { es: 'Tu negocio de un vistazo',      pt: 'O seu negócio de relance' },
    body: {
      es: 'El Panel de Gestión muestra los KPIs clave: Ingresos del mes, Stock total y clientes activos. El gráfico de barras es interactivo — haz clic en un mes para filtrar todos los datos.',
      pt: 'O Painel de Gestão mostra os KPIs principais: Receita do mês, Estoque total e clientes ativos. O gráfico de barras é interativo — clique em um mês para filtrar todos os dados.',
    },
    color: 'from-slate-800 to-slate-700', iconBg: 'bg-blue-500/20', dot: 'bg-blue-400',
    tips: [
      { es: 'Haz clic en una barra para filtrar por ese mes',               pt: 'Clique em uma barra para filtrar por aquele mês' },
      { es: 'Usa "Este mes / Próximo mes / Este año" para filtros rápidos', pt: 'Use "Este mês / Próximo mês / Este ano" para filtros rápidos' },
      { es: 'Los Pedidos Recientes se actualizan con el filtro activo',     pt: 'Os Pedidos Recentes se atualizam com o filtro ativo' },
    ],
  },
  {
    icon: 'clients',
    title:    { es: 'Clientes',           pt: 'Clientes' },
    subtitle: { es: 'Activos · Prospectos', pt: 'Ativos · Prospects' },
    body: {
      es: 'Gestiona tus Clientes Activos y Prospectos. Cada cliente tiene ficha completa con historial de pedidos, contacto y Vendedor/a responsable. Crea nuevos con "+ Nuevo Cliente".',
      pt: 'Gerencie seus Clientes Ativos e Prospects. Cada cliente tem ficha completa com histórico de pedidos, contato e Vendedor/a responsável. Crie novos com "+ Novo Cliente".',
    },
    color: 'from-emerald-800 to-emerald-700', iconBg: 'bg-emerald-500/20', dot: 'bg-emerald-400',
    tips: [
      { es: 'Haz clic en un cliente para ver su ficha y sus pedidos',              pt: 'Clique em um cliente para ver sua ficha e seus pedidos' },
      { es: 'Ciudad y Tipo de cliente son editables — escribe para crear nuevos',  pt: 'Cidade e Tipo de cliente são editáveis — escreva para criar novos' },
      { es: 'Los vendedores se añaden desde la pestaña "Vendedores"',              pt: 'Os vendedores são adicionados na aba "Vendedores"' },
    ],
  },
  {
    icon: 'stock',
    title:    { es: 'Stock',                         pt: 'Estoque' },
    subtitle: { es: 'Control total de tus vinos',    pt: 'Controle total dos seus vinhos' },
    body: {
      es: 'Registra cada entrada de vinos con precio de compra, precio de lista y ubicación. Al crear un Nuevo Pedido, el stock se descuenta automáticamente.',
      pt: 'Registre cada entrada de vinhos com preço de compra, preço de lista e localização. Ao criar um Novo Pedido, o estoque é descontado automaticamente.',
    },
    color: 'from-purple-900 to-purple-700', iconBg: 'bg-purple-500/20', dot: 'bg-purple-400',
    tips: [
      { es: 'Usa "+ Agregar al Stock" para añadir un vino nuevo',       pt: 'Use "+ Adicionar ao Estoque" para adicionar um vinho novo' },
      { es: '"Reponer" añade más unidades a un vino ya existente',      pt: '"Repor" adiciona mais unidades a um vinho já existente' },
      { es: 'Edita precio y cantidad directamente en la tabla',         pt: 'Edite preço e quantidade diretamente na tabela' },
    ],
  },
  {
    icon: 'cart',
    title:    { es: 'Nuevo Pedido',                              pt: 'Novo Pedido' },
    subtitle: { es: 'Registrar pedido recibido del cliente',     pt: 'Registrar pedido recebido do cliente' },
    body: {
      es: 'Selecciona el Cliente, Vendedor/a responsable, los Vinos y cantidades. El Precio venta se rellena con el precio de lista automáticamente. Elige el Tipo y Plazo de pago.',
      pt: 'Selecione o Cliente, Vendedor/a responsável, os Vinhos e quantidades. O Preço venda é preenchido com o preço de lista automaticamente. Escolha o Tipo e Prazo de pagamento.',
    },
    color: 'from-orange-800 to-orange-700', iconBg: 'bg-orange-500/20', dot: 'bg-orange-400',
    tips: [
      { es: 'La fecha del pedido es editable — registra ventas pasadas',  pt: 'A data do pedido é editável — registre vendas passadas' },
      { es: 'El tipo "Prospect (brinde)" no genera cobro pendiente',      pt: 'O tipo "Prospect (brinde)" não gera cobrança pendente' },
      { es: 'Puedes añadir varios Vinos en un mismo pedido',              pt: 'Você pode adicionar vários Vinhos no mesmo pedido' },
    ],
  },
  {
    icon: 'payment',
    title:    { es: 'Cobros',                            pt: 'Cobranças' },
    subtitle: { es: 'Pagos pendientes e historial',      pt: 'Pagamentos pendentes e histórico' },
    body: {
      es: 'Aquí gestionas los envíos y cobros de cada pedido. Los pedidos aparecen en tres columnas: Vencidos (en rojo), Por vencer y Recibidos. Expande cualquier pedido con la flecha para ver el detalle, registrar el envío (empresa + código de seguimiento), marcar como Enviado y marcar pagos como Pagado.',
      pt: 'Aqui você gerencia os envios e cobranças de cada pedido. Os pedidos aparecem em três colunas: Vencidas (em vermelho), A vencer e Recebidas. Expanda qualquer pedido com a seta para ver o detalhe, registrar o envio (empresa + código de rastreio), marcar como Enviado e marcar pagamentos como Pago.',
    },
    color: 'from-teal-800 to-teal-700', iconBg: 'bg-teal-500/20', dot: 'bg-teal-400',
    tips: [
      { es: 'Expande el pedido → pestaña "Envío" para registrar el tracking', pt: 'Expanda o pedido → aba "Envio" para registrar o rastreio' },
      { es: 'Pestaña "Cobro" → marca cada pago como Pagado con la fecha',     pt: 'Aba "Cobrança" → marque cada pagamento como Pago com a data' },
      { es: 'El estado del pedido (Enviado / Pagado) se actualiza solo',       pt: 'O status do pedido (Enviado / Pago) é atualizado automaticamente' },
    ],
  },
  {
    icon: 'settings',
    title:    { es: 'Ajustes',                    pt: 'Configurações' },
    subtitle: { es: 'IA, cuenta y preferencias',  pt: 'IA, conta e preferências' },
    body: {
      es: 'Desde Ajustes puedes gestionar tu Cuenta, añadir vendedores a tu equipo y configurar la Inteligencia Artificial con tu propia clave de API (BYOK).',
      pt: 'Em Configurações você pode gerenciar sua Conta, adicionar vendedores à sua equipe e configurar a Inteligência Artificial com sua própria chave de API (BYOK).',
    },
    color: 'from-zinc-800 to-zinc-700', iconBg: 'bg-zinc-500/20', dot: 'bg-zinc-400',
    tips: [
      { es: 'Los vendedores reciben acceso con su email y contraseña',  pt: 'Os vendedores recebem acesso com e-mail e senha' },
      { es: 'Cambia el idioma (ES/PT) desde cualquier página',         pt: 'Mude o idioma (ES/PT) em qualquer página' },
      { es: 'El modo oscuro/claro se guarda por dispositivo',          pt: 'O modo escuro/claro é salvo por dispositivo' },
    ],
  },
]

const UI = {
  next:     { es: 'Siguiente →',  pt: 'Próximo →' },
  prev:     { es: '← Anterior',   pt: '← Anterior' },
  start:    { es: '¡Empezar!',    pt: 'Começar!' },
  pickLang: { es: 'Elige tu idioma', pt: 'Escolha seu idioma' },
  langSub:  {
    es: 'Puedes cambiarlo en cualquier momento desde el menú lateral',
    pt: 'Você pode alterá-lo a qualquer momento no menu lateral',
  },
}

export default function OnboardingTour({
  onOpen,
  userId,
}: {
  onOpen?: (fn: () => void) => void
  userId?: string
}) {
  const [visible,   setVisible]   = useState(false)
  const [lang,      setLang]      = useState<Lang | null>(null)
  const [step,      setStep]      = useState(0)
  const [animDir,   setAnimDir]   = useState<'next' | 'prev'>('next')
  const [animating, setAnimating] = useState(false)

  const open = useCallback(() => { setLang(null); setStep(0); setVisible(true) }, [])

  useEffect(() => { if (onOpen) onOpen(open) }, [onOpen, open])

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem(storageKey(userId))) {
      const t = setTimeout(() => setVisible(true), 700)
      return () => clearTimeout(t)
    }
  }, [userId])

  function close() {
    if (typeof window !== 'undefined') localStorage.setItem(storageKey(userId), '1')
    setVisible(false)
  }

  function go(dir: 'next' | 'prev') {
    if (animating) return
    const next = dir === 'next' ? step + 1 : step - 1
    if (next < 0 || next >= STEPS.length) return
    setAnimDir(dir)
    setAnimating(true)
    setTimeout(() => { setStep(next); setAnimating(false) }, 200)
  }

  if (!visible) return null

  const L = lang ?? 'es'
  const cur = STEPS[step]
  const isLast = step === STEPS.length - 1

  /* ── Language picker ── */
  if (!lang) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)' }}
      >
        <div className="w-full max-w-sm bg-app-card rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-wine-900 to-wine-700 px-8 pt-10 pb-8 text-center relative">
            <button
              onClick={close}
              className="absolute top-4 right-4 text-white/40 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <Icon d={ICONS.close} size={16} />
            </button>
            <div className="flex justify-center mb-4">
              <div className="bg-white/10 rounded-2xl p-3">
                <GrapesNutsLogo size="md" />
              </div>
            </div>
            <h2 className="text-white text-xl font-bold">Grapes & Nuts</h2>
          </div>

          {/* Language selection */}
          <div className="px-8 py-7 text-center">
            <p className="text-app-text font-semibold text-base mb-1">
              {UI.pickLang.es} / {UI.pickLang.pt}
            </p>
            <p className="text-app-text3 text-xs mb-7 leading-relaxed">
              {UI.langSub.es}<br />{UI.langSub.pt}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setLang('es')}
                className="flex-1 py-5 rounded-2xl border-2 border-app-border hover:border-wine-500 hover:bg-wine-50 transition-all group flex flex-col items-center gap-2"
              >
                <span className="text-xs font-bold tracking-widest text-app-text3 group-hover:text-wine-600 transition-colors">ES</span>
                <span className="text-sm font-bold text-app-text group-hover:text-wine-700 transition-colors">Español</span>
              </button>
              <button
                onClick={() => setLang('pt')}
                className="flex-1 py-5 rounded-2xl border-2 border-app-border hover:border-wine-500 hover:bg-wine-50 transition-all group flex flex-col items-center gap-2"
              >
                <span className="text-xs font-bold tracking-widest text-app-text3 group-hover:text-wine-600 transition-colors">PT</span>
                <span className="text-sm font-bold text-app-text group-hover:text-wine-700 transition-colors">Português</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Tour steps ── */
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="relative w-full max-w-lg bg-app-card rounded-3xl shadow-2xl overflow-hidden" style={{ maxHeight: '90vh' }}>

        {/* Gradient header */}
        <div className={`bg-gradient-to-br ${cur.color} px-8 pt-8 pb-10 relative`}>
          <button
            onClick={close}
            className="absolute top-4 right-4 text-white/40 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <Icon d={ICONS.close} size={16} />
          </button>

          <div
            className="transition-all duration-200"
            style={{
              opacity: animating ? 0 : 1,
              transform: animating ? (animDir === 'next' ? 'translateX(18px)' : 'translateX(-18px)') : 'none',
            }}
          >
            <div className={`${cur.iconBg} w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-white`}>
              <Icon d={ICONS[cur.icon]} size={28} />
            </div>
            <p className="text-white/55 text-xs font-semibold uppercase tracking-widest mb-1">{cur.subtitle[L]}</p>
            <h2 className="text-white text-2xl font-bold leading-tight">{cur.title[L]}</h2>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => { if (!animating) { setAnimDir(i > step ? 'next' : 'prev'); setStep(i) } }}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ background: i === step ? 'white' : 'rgba(255,255,255,0.3)', width: i === step ? '24px' : '6px' }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 overflow-y-auto" style={{ maxHeight: '38vh' }}>
          <div className="transition-all duration-200" style={{ opacity: animating ? 0 : 1 }}>
            <p className="text-app-text text-sm leading-relaxed mb-5">{cur.body[L]}</p>
            {cur.tips.length > 0 && (
              <ul className="space-y-2.5">
                {cur.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`${cur.dot} text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      {i + 1}
                    </span>
                    <span className="text-sm text-app-text2 leading-snug">{tip[L]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 pt-4 flex items-center justify-between border-t border-app-border">
          <button
            onClick={() => go('prev')}
            disabled={step === 0}
            className="px-4 py-2 text-sm text-app-text2 hover:text-app-text disabled:opacity-0 disabled:pointer-events-none transition-colors"
          >
            {UI.prev[L]}
          </button>

          <span className="text-xs text-app-text3 font-mono tabular-nums">{step + 1} / {STEPS.length}</span>

          {isLast ? (
            <button
              onClick={close}
              className="px-5 py-2.5 text-sm font-semibold bg-wine-600 hover:bg-wine-700 text-white rounded-xl transition-colors"
            >
              {UI.start[L]}
            </button>
          ) : (
            <button
              onClick={() => go('next')}
              className="px-5 py-2.5 text-sm font-semibold bg-wine-600 hover:bg-wine-700 text-white rounded-xl transition-colors"
            >
              {UI.next[L]}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
