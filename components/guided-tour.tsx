'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import GrapesNutsLogo from '@/components/logo'

const STORAGE_KEY = (uid?: string) => `gn_guided_tour_seen_v1_${uid ?? 'anon'}`

/* ── Icons ── */
function Icon({ d, size = 28 }: { d: string | string[]; size?: number }) {
  const paths = Array.isArray(d) ? d : [d]
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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

/* ── Step definitions ── */
type Step = {
  page: string
  selector: string
  icon: keyof typeof ICONS
  gradient: string
  iconBg: string
  dot: string
  dotText: string
  subtitle: string
  title: string
  body: string
  tips: string[]
}

const STEPS: Step[] = [
  {
    page: '/dashboard',
    selector: '[data-tour="kpi-cards"]',
    icon: 'chart',
    gradient: 'from-slate-800 to-slate-700',
    iconBg: 'bg-blue-500/20', dot: 'bg-blue-500', dotText: 'text-white',
    subtitle: 'O seu negócio de relance',
    title: 'Painel Financeiro',
    body: 'Os 4 cartões mostram a saúde do negócio em tempo real: receita do mês, pedidos em aberto, cobranças vencidas e pagamentos recebidos.',
    tips: [
      'Os números atualizam automaticamente a cada pedido registado',
      'Clique em qualquer cartão para explorar o detalhe',
      'Use os filtros rápidos: Este mês / Próximo mês / Este ano',
    ],
  },
  {
    page: '/dashboard',
    selector: '[data-tour="revenue-chart"]',
    icon: 'chart',
    gradient: 'from-blue-900 to-blue-700',
    iconBg: 'bg-sky-400/20', dot: 'bg-sky-400', dotText: 'text-white',
    subtitle: 'Evolução mensal das vendas',
    title: 'Gráfico de Receita',
    body: 'Visualize a evolução mensal das suas vendas. O gráfico é interativo — clique numa barra para filtrar os pedidos daquele mês.',
    tips: [
      'Clique numa barra para filtrar por aquele mês',
      'A tabela de pedidos abaixo atualiza instantaneamente',
      'Filtre por cliente ou vinho para análises mais detalhadas',
    ],
  },
  {
    page: '/dashboard',
    selector: '[data-tour="orders-table"]',
    icon: 'payment',
    gradient: 'from-teal-800 to-teal-700',
    iconBg: 'bg-teal-500/20', dot: 'bg-teal-400', dotText: 'text-white',
    subtitle: 'Pagamentos pendentes e histórico',
    title: 'Pedidos & Cobranças',
    body: 'Todos os pedidos num só lugar. Expanda qualquer linha com a seta para registar o envio, código de rastreio e marcar pagamentos como recebidos.',
    tips: [
      'Expanda o pedido → aba Envio para registar o rastreio',
      'Aba Cobrança → marque cada pagamento como Pago com a data',
      'O status (Enviado / Pago) atualiza-se automaticamente',
    ],
  },
  {
    page: '/dashboard/estoque',
    selector: '[data-tour="add-stock-btn"]',
    icon: 'stock',
    gradient: 'from-purple-900 to-purple-700',
    iconBg: 'bg-purple-500/20', dot: 'bg-purple-400', dotText: 'text-white',
    subtitle: 'Controle total dos seus vinhos',
    title: 'Estoque',
    body: 'Os seus vinhos já estão aqui! Quando receber nova mercadoria, clique em "+ Novo Produto" para registar a entrada com preço de compra e quantidade.',
    tips: [
      'O estoque desconta automaticamente em cada pedido confirmado',
      '"Repor" adiciona unidades a um vinho já existente',
      'Edite preço e quantidade diretamente na tabela',
    ],
  },
  {
    page: '/dashboard/clientes',
    selector: '[data-tour="client-list"]',
    icon: 'clients',
    gradient: 'from-emerald-800 to-emerald-700',
    iconBg: 'bg-emerald-500/20', dot: 'bg-emerald-400', dotText: 'text-white',
    subtitle: 'Ativos · Prospects',
    title: 'Clientes',
    body: 'Gerencie os seus Clientes Ativos e Prospects. Cada cliente tem ficha completa com histórico de pedidos, contacto e notas.',
    tips: [
      'Clique num cliente para ver a ficha e o histórico de pedidos',
      'Cidade e Tipo de cliente são editáveis',
      'Use "+ Novo Cliente" para adicionar novos clientes',
    ],
  },
  {
    page: '/dashboard/vendas',
    selector: '[data-tour="sales-form"]',
    icon: 'cart',
    gradient: 'from-orange-800 to-orange-700',
    iconBg: 'bg-orange-500/20', dot: 'bg-orange-400', dotText: 'text-white',
    subtitle: 'Registrar pedido recebido do cliente',
    title: 'Novo Pedido',
    body: 'Selecione o cliente, escolha os vinhos e as quantidades — o preço de lista preenche-se automaticamente. Defina o prazo de pagamento e confirme.',
    tips: [
      'A data do pedido é editável — registe também vendas passadas',
      'O tipo "Prospect (brinde)" não gera cobrança pendente',
      'Pode adicionar vários vinhos no mesmo pedido',
    ],
  },
  {
    page: '/dashboard/configuracoes',
    selector: '[data-tour="profile-section"]',
    icon: 'settings',
    gradient: 'from-zinc-800 to-zinc-700',
    iconBg: 'bg-zinc-500/20', dot: 'bg-zinc-400', dotText: 'text-white',
    subtitle: 'Conta e preferências',
    title: 'Configurações',
    body: 'Atualize o seu perfil, adicione vendedores à equipa e escolha o idioma da plataforma. A equipa DeTech está sempre disponível para ajudar.',
    tips: [
      'Os vendedores recebem acesso com e-mail e senha',
      'Mude o idioma (ES/PT) em qualquer página',
      'O modo escuro/claro é guardado por dispositivo',
    ],
  },
]

/* ── Helpers ── */
type Rect = { top: number; left: number; width: number; height: number }

async function waitForElement(selector: string, retries = 16): Promise<Element | null> {
  for (let i = 0; i < retries; i++) {
    const el = document.querySelector(selector)
    if (el) return el
    await new Promise(r => setTimeout(r, 250))
  }
  return null
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

/* ── Component ── */
export default function GuidedTour({
  onOpen,
  userId,
  skipAutoOpen,
}: {
  onOpen?: (fn: () => void) => void
  userId?: string
  skipAutoOpen?: boolean
}) {
  const router   = useRouter()
  const pathname = usePathname()

  const [active,     setActive]     = useState(false)
  const [stepIdx,    setStepIdx]    = useState(0)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [navigating, setNavigating] = useState(false)
  const [animDir,    setAnimDir]    = useState<'next' | 'prev'>('next')
  const [animating,  setAnimating]  = useState(false)
  const [cardPos,    setCardPos]    = useState<{ top: number; left: number } | null>(null)

  const overlayRef = useRef<HTMLDivElement>(null)
  const cardRef    = useRef<HTMLDivElement>(null)

  /* expose open fn */
  const openTour = useCallback(() => {
    setStepIdx(0); setActive(true); setNavigating(false)
    setTargetRect(null); setCardPos(null)
  }, [])
  useEffect(() => { onOpen?.(openTour) }, [onOpen, openTour])

  /* auto-open first visit */
  useEffect(() => {
    if (skipAutoOpen) return
    const key = STORAGE_KEY(userId)
    if (!localStorage.getItem(key)) {
      const t = setTimeout(() => setActive(true), 700)
      return () => clearTimeout(t)
    }
  }, [userId, skipAutoOpen])

  const step = STEPS[stepIdx]

  /* navigate to step's page */
  useEffect(() => {
    if (!active) return
    if (pathname !== step.page) {
      setNavigating(true)
      setTargetRect(null)
      setCardPos(null)
      router.push(step.page)
    } else {
      setNavigating(false)
    }
  }, [active, stepIdx, step.page, pathname, router])

  /* find element + measure */
  useEffect(() => {
    if (!active || navigating || pathname !== step.page) return
    let cancelled = false

    ;(async () => {
      const el = await waitForElement(step.selector)
      if (cancelled) return
      if (!el) { setTargetRect(null); return }

      const r = el.getBoundingClientRect()
      const PAD = 10
      const rect: Rect = {
        top:    r.top    - PAD,
        left:   r.left   - PAD,
        width:  r.width  + PAD * 2,
        height: r.height + PAD * 2,
      }
      setTargetRect(rect)

      if (r.top < 80 || r.bottom > window.innerHeight - 80) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })()

    return () => { cancelled = true }
  }, [active, navigating, stepIdx, step.selector, step.page, pathname])

  /* position card near element */
  useEffect(() => {
    if (!targetRect || !cardRef.current) { setCardPos(null); return }

    const CARD_W  = 340
    const CARD_H  = cardRef.current.offsetHeight || 460
    const MARGIN  = 14
    const vw = window.innerWidth
    const vh = window.innerHeight

    const spaceBelow  = vh - (targetRect.top + targetRect.height)
    const spaceAbove  = targetRect.top

    let top: number
    if (spaceBelow >= CARD_H + MARGIN) {
      top = targetRect.top + targetRect.height + MARGIN
    } else if (spaceAbove >= CARD_H + MARGIN) {
      top = targetRect.top - CARD_H - MARGIN
    } else {
      // not enough space above or below — anchor to bottom of viewport
      top = vh - CARD_H - 16
    }

    const idealLeft = targetRect.left + targetRect.width / 2 - CARD_W / 2
    const left = clamp(idealLeft, 12, vw - CARD_W - 12)

    setCardPos({ top: clamp(top, 8, vh - CARD_H - 8), left })
  }, [targetRect])

  /* close */
  function close() {
    setActive(false)
    setTargetRect(null)
    setNavigating(false)
    setCardPos(null)
    localStorage.setItem(STORAGE_KEY(userId), '1')
  }

  /* animated navigation */
  function goTo(idx: number) {
    if (animating || idx < 0 || idx >= STEPS.length) return
    setAnimDir(idx > stepIdx ? 'next' : 'prev')
    setAnimating(true)
    setTimeout(() => {
      setStepIdx(idx)
      setTargetRect(null)
      setCardPos(null)
      setAnimating(false)
    }, 180)
  }

  if (!active) return null

  const TOTAL  = STEPS.length
  const isLast = stepIdx === TOTAL - 1
  const vw = typeof window !== 'undefined' ? window.innerWidth  : 1440
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  const cx = targetRect
    ? { x: targetRect.left, y: targetRect.top, w: targetRect.width, h: targetRect.height, r: 14 }
    : null

  /* default card position (centered) when no targetRect yet */
  const defaultPos = { top: vh / 2 - 230, left: vw / 2 - 170 }
  const pos = cardPos ?? defaultPos

  return (
    <>
      <style>{`
        @keyframes gn-pulse-ring {
          0%   { transform: scale(1);    opacity: .9; }
          50%  { transform: scale(1.035); opacity: .35; }
          100% { transform: scale(1);    opacity: .9; }
        }
        .gn-ring { animation: gn-pulse-ring 1.9s ease-in-out infinite; }
      `}</style>

      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9900]"
        style={{ pointerEvents: 'auto' }}
        onClick={e => { if (e.target === overlayRef.current) close() }}
      >
        {/* SVG spotlight */}
        <svg width={vw} height={vh} className="absolute inset-0" style={{ display: 'block' }}>
          <defs>
            <mask id="gn-cutout-mask">
              <rect width={vw} height={vh} fill="white" />
              {cx && (
                <rect x={cx.x} y={cx.y} width={cx.w} height={cx.h}
                  rx={cx.r} ry={cx.r} fill="black" />
              )}
            </mask>
          </defs>
          <rect width={vw} height={vh} fill="rgba(0,0,0,0.65)" mask="url(#gn-cutout-mask)" />
          {cx && (
            <rect
              className="gn-ring"
              x={cx.x - 3} y={cx.y - 3}
              width={cx.w + 6} height={cx.h + 6}
              rx={cx.r + 3} ry={cx.r + 3}
              fill="none" stroke="#9F1239" strokeWidth="2.5"
              style={{ transformOrigin: `${cx.x + cx.w / 2}px ${cx.y + cx.h / 2}px` }}
            />
          )}
        </svg>

        {/* Navigating state */}
        {navigating && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
            <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3 max-w-xs text-center">
              <div className="w-8 h-8 rounded-full border-2 border-wine-200 border-t-wine-600 animate-spin" />
              <p className="text-sm font-medium text-app-text">
                A navegar para <span className="font-bold">{step.title}</span>…
              </p>
            </div>
          </div>
        )}

        {/* Tour card — rich presentation */}
        {!navigating && (
          <div
            ref={cardRef}
            className="absolute rounded-3xl shadow-2xl overflow-hidden bg-app-card"
            style={{ width: 340, top: pos.top, left: pos.left, zIndex: 9910, pointerEvents: 'auto' }}
          >
            {/* Gradient header */}
            <div className={`bg-gradient-to-br ${step.gradient} px-6 pt-6 pb-7 relative`}>
              {/* Close */}
              <button
                onClick={close}
                className="absolute top-3 right-3 text-white/40 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                aria-label="Fechar tour"
              >
                <Icon d={ICONS.close} size={15} />
              </button>

              {/* Content — animated */}
              <div
                className="transition-all duration-200"
                style={{
                  opacity: animating ? 0 : 1,
                  transform: animating
                    ? (animDir === 'next' ? 'translateX(16px)' : 'translateX(-16px)')
                    : 'none',
                }}
              >
                <div className={`${step.iconBg} w-11 h-11 rounded-2xl flex items-center justify-center mb-3 text-white`}>
                  <Icon d={ICONS[step.icon]} size={22} />
                </div>
                <p className="text-white/55 text-[10px] font-semibold uppercase tracking-widest mb-0.5">
                  {step.subtitle}
                </p>
                <h2 className="text-white text-xl font-bold leading-tight">{step.title}</h2>
              </div>

              {/* Progress dots */}
              <div className="flex gap-1.5 mt-4">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      background: i === stepIdx ? 'white' : 'rgba(255,255,255,0.28)',
                      width: i === stepIdx ? '20px' : '6px',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Body */}
            <div
              className="px-6 py-5 transition-all duration-200"
              style={{ opacity: animating ? 0 : 1 }}
            >
              <p className="text-app-text text-sm leading-relaxed mb-4">{step.body}</p>

              {/* Numbered tips */}
              <ul className="space-y-2.5">
                {step.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`${step.dot} ${step.dotText} text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-app-text2 leading-snug">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 pt-3 flex items-center justify-between border-t border-app-border gap-2">
              <button
                onClick={() => goTo(stepIdx - 1)}
                disabled={stepIdx === 0}
                className="px-3 py-2 text-sm text-app-text2 hover:text-app-text disabled:opacity-0 disabled:pointer-events-none transition-colors"
              >
                ← Anterior
              </button>

              <span className="text-[11px] text-app-text3 font-mono tabular-nums">
                {stepIdx + 1} / {TOTAL}
              </span>

              {isLast ? (
                <button
                  onClick={close}
                  className="px-4 py-2 text-sm font-semibold bg-wine-600 hover:bg-wine-700 text-white rounded-xl transition-colors"
                >
                  Concluir ✓
                </button>
              ) : (
                <button
                  onClick={() => goTo(stepIdx + 1)}
                  className="px-4 py-2 text-sm font-semibold bg-wine-600 hover:bg-wine-700 text-white rounded-xl transition-colors"
                >
                  Próximo →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
