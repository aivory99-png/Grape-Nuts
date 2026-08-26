'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/* ── Storage ── */
const STORAGE_KEY = (uid?: string) => `gn_guided_tour_seen_v1_${uid ?? 'anon'}`

/* ── Step definitions ── */
type Step = {
  page: string
  selector: string
  title: string
  body: string
  hint?: string
}

const STEPS: Step[] = [
  {
    page: '/dashboard',
    selector: '[data-tour="kpi-cards"]',
    title: 'Os seus números do mês',
    body: 'Estes 4 cartões mostram a saúde do negócio em tempo real: receita, pedidos em aberto, cobranças vencidas e pagamentos recebidos. Todos atualizam a cada pedido registado.',
    hint: 'Clique em qualquer cartão para explorar o detalhe.',
  },
  {
    page: '/dashboard',
    selector: '[data-tour="revenue-chart"]',
    title: 'Gráfico de receita',
    body: 'Evolução mensal das suas vendas. Clique numa barra para filtrar os pedidos daquele mês — a tabela abaixo muda instantaneamente.',
    hint: 'Experimente clicar numa barra!',
  },
  {
    page: '/dashboard',
    selector: '[data-tour="orders-table"]',
    title: 'Pedidos & Cobranças',
    body: 'Todos os pedidos num só lugar — filtre por Aberto, Enviado ou Pago. Expanda qualquer linha com a seta para ver o detalhe, registar o envio e marcar o pagamento como recebido.',
    hint: 'Aqui também gere as suas cobranças.',
  },
  {
    page: '/dashboard/estoque',
    selector: '[data-tour="add-stock-btn"]',
    title: 'Estoque de vinhos',
    body: 'Os seus vinhos já estão aqui! Quando receber nova mercadoria, clique em "+ Novo Produto" para registar a entrada com preço de compra e quantidade. O stock desconta automaticamente a cada pedido.',
    hint: '+ Novo Produto → registar entrada de estoque.',
  },
  {
    page: '/dashboard/clientes',
    selector: '[data-tour="client-list"]',
    title: 'Os seus clientes',
    body: 'Lista de todos os seus clientes e prospects. Clique em qualquer um para ver o histórico completo de pedidos, volume, contacto e notas.',
    hint: 'Use "+ Novo Cliente" para adicionar novos clientes.',
  },
  {
    page: '/dashboard/vendas',
    selector: '[data-tour="sales-form"]',
    title: 'Registar um pedido',
    body: 'Selecione o cliente, escolha os vinhos e as quantidades — o preço de lista preenche-se automaticamente. Defina o prazo de pagamento e confirme. É mais rápido que qualquer folha de Excel!',
    hint: 'O stock é descontado automaticamente ao confirmar.',
  },
  {
    page: '/dashboard/configuracoes',
    selector: '[data-tour="profile-section"]',
    title: 'Configurações',
    body: 'Atualize o seu perfil, adicione vendedores à equipa e escolha o idioma da plataforma (Português ou Espanhol). A equipa DeTech está sempre disponível para ajudar.',
    hint: 'Pode mudar o idioma a qualquer momento no menu lateral.',
  },
]

/* ── Types ── */
type Rect = { top: number; left: number; width: number; height: number }

/* ── Helpers ── */
async function waitForElement(selector: string, retries = 12): Promise<Element | null> {
  for (let i = 0; i < retries; i++) {
    const el = document.querySelector(selector)
    if (el) return el
    await new Promise(r => setTimeout(r, 250))
  }
  return null
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

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
  const router    = useRouter()
  const pathname  = usePathname()

  const [active,    setActive]    = useState(false)
  const [stepIdx,   setStepIdx]   = useState(0)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [navigating, setNavigating] = useState(false)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; arrowUp: boolean } | null>(null)

  const overlayRef  = useRef<HTMLDivElement>(null)
  const tooltipRef  = useRef<HTMLDivElement>(null)
  const stepIdxRef  = useRef(stepIdx)
  stepIdxRef.current = stepIdx

  /* expose open function */
  const openTour = useCallback(() => {
    setStepIdx(0)
    setActive(true)
    setNavigating(false)
  }, [])

  useEffect(() => {
    onOpen?.(openTour)
  }, [onOpen, openTour])

  /* auto-open (first visit) */
  useEffect(() => {
    if (skipAutoOpen) return
    const key = STORAGE_KEY(userId)
    if (!localStorage.getItem(key)) {
      const t = setTimeout(() => setActive(true), 600)
      return () => clearTimeout(t)
    }
  }, [userId, skipAutoOpen])

  const step = STEPS[stepIdx]

  /* navigate to the step's page if needed */
  useEffect(() => {
    if (!active) return
    if (pathname !== step.page) {
      setNavigating(true)
      setTargetRect(null)
      router.push(step.page)
    } else {
      setNavigating(false)
    }
  }, [active, stepIdx, step.page, pathname, router])

  /* find element and compute rects */
  useEffect(() => {
    if (!active || navigating) return
    if (pathname !== step.page) return

    let cancelled = false

    ;(async () => {
      const el = await waitForElement(step.selector)
      if (cancelled || !el) {
        setTargetRect(null)
        return
      }

      function measure() {
        if (cancelled) return
        const r = el!.getBoundingClientRect()
        const PAD = 8
        const rect = {
          top:    r.top    - PAD,
          left:   r.left   - PAD,
          width:  r.width  + PAD * 2,
          height: r.height + PAD * 2,
        }
        setTargetRect(rect)

        /* scroll element into view if needed */
        if (r.top < 60 || r.bottom > window.innerHeight - 60) {
          el!.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }

      measure()
    })()

    return () => { cancelled = true }
  }, [active, navigating, stepIdx, step.selector, step.page, pathname])

  /* position tooltip relative to targetRect */
  useEffect(() => {
    if (!targetRect || !tooltipRef.current) {
      setTooltipPos(null)
      return
    }
    const TW = 320
    const TH = tooltipRef.current.offsetHeight || 200
    const MARGIN = 12
    const vw = window.innerWidth
    const vh = window.innerHeight

    const spaceBelow = vh - (targetRect.top + targetRect.height)
    const spaceAbove = targetRect.top

    let top: number
    let arrowUp: boolean
    if (spaceBelow >= TH + MARGIN || spaceBelow >= spaceAbove) {
      top = targetRect.top + targetRect.height + MARGIN
      arrowUp = true
    } else {
      top = targetRect.top - TH - MARGIN
      arrowUp = false
    }

    const idealLeft = targetRect.left + targetRect.width / 2 - TW / 2
    const left = clamp(idealLeft, 12, vw - TW - 12)

    setTooltipPos({ top: clamp(top, 8, vh - TH - 8), left, arrowUp })
  }, [targetRect])

  /* close */
  function close(markSeen = true) {
    setActive(false)
    setTargetRect(null)
    setNavigating(false)
    if (markSeen) localStorage.setItem(STORAGE_KEY(userId), '1')
  }

  /* next */
  function goNext() {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(s => s + 1)
      setTargetRect(null)
      setTooltipPos(null)
    } else {
      close()
    }
  }

  /* prev */
  function goPrev() {
    if (stepIdx > 0) {
      setStepIdx(s => s - 1)
      setTargetRect(null)
      setTooltipPos(null)
    }
  }

  if (!active) return null

  const TOTAL  = STEPS.length
  const isLast = stepIdx === TOTAL - 1

  /* SVG cutout dims */
  const vw = typeof window !== 'undefined' ? window.innerWidth  : 1440
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  const cx = targetRect
    ? { x: targetRect.left, y: targetRect.top, w: targetRect.width, h: targetRect.height, r: 14 }
    : null

  return (
    <>
      {/* Pulse animation */}
      <style>{`
        @keyframes gn-pulse {
          0%   { transform: scale(1);   opacity: .9; }
          50%  { transform: scale(1.04); opacity: .4; }
          100% { transform: scale(1);   opacity: .9; }
        }
        .gn-pulse { animation: gn-pulse 1.8s ease-in-out infinite; }
      `}</style>

      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9900]"
        style={{ pointerEvents: 'auto' }}
        onClick={e => { if (e.target === overlayRef.current) close() }}
      >
        {/* SVG mask */}
        <svg
          width={vw} height={vh}
          className="absolute inset-0"
          style={{ display: 'block' }}
        >
          <defs>
            <mask id="gn-cutout">
              <rect width={vw} height={vh} fill="white" />
              {cx && (
                <rect
                  x={cx.x} y={cx.y} width={cx.w} height={cx.h}
                  rx={cx.r} ry={cx.r}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width={vw} height={vh}
            fill="rgba(0,0,0,0.62)"
            mask="url(#gn-cutout)"
          />
          {/* Pulsing border ring */}
          {cx && (
            <rect
              className="gn-pulse"
              x={cx.x - 3} y={cx.y - 3}
              width={cx.w + 6} height={cx.h + 6}
              rx={cx.r + 3} ry={cx.r + 3}
              fill="none"
              stroke="#9F1239"
              strokeWidth="2.5"
              style={{ transformOrigin: `${cx.x + cx.w / 2}px ${cx.y + cx.h / 2}px` }}
            />
          )}
        </svg>

        {/* Loading/navigating state */}
        {navigating && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
            <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3 max-w-xs text-center">
              <div className="w-8 h-8 rounded-full border-2 border-wine-200 border-t-wine-600 animate-spin" />
              <p className="text-sm font-medium text-app-text">A navegar para {step.page === '/dashboard' ? 'o painel' : step.page.split('/').pop()}…</p>
            </div>
          </div>
        )}

        {/* Tooltip card */}
        {!navigating && (
          <div
            ref={tooltipRef}
            className="absolute bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{
              width: 320,
              top: tooltipPos?.top ?? (vh / 2 - 100),
              left: tooltipPos?.left ?? (vw / 2 - 160),
              zIndex: 9910,
              pointerEvents: 'auto',
            }}
          >
            {/* Progress bar */}
            <div className="h-1 bg-app-border">
              <div
                className="h-full bg-wine-600 transition-all duration-500"
                style={{ width: `${((stepIdx + 1) / TOTAL) * 100}%` }}
              />
            </div>

            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-app-border flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-wine-400 uppercase tracking-widest">
                  Passo {stepIdx + 1} de {TOTAL}
                </span>
                <h3 className="text-base font-bold text-app-text mt-0.5 leading-snug">{step.title}</h3>
              </div>
              <button
                onClick={() => close()}
                className="flex-shrink-0 text-app-text3 hover:text-app-text transition-colors mt-0.5"
                aria-label="Fechar tour"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-app-text leading-relaxed">{step.body}</p>
              {step.hint && (
                <div className="flex items-start gap-2 bg-wine-50 rounded-xl px-3 py-2.5">
                  <span className="text-wine-500 mt-0.5 flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                  </span>
                  <p className="text-xs text-wine-700 leading-relaxed">{step.hint}</p>
                </div>
              )}
            </div>

            {/* Step dots */}
            <div className="px-5 pb-4 flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setStepIdx(i); setTargetRect(null); setTooltipPos(null) }}
                  className={`rounded-full transition-all ${i === stepIdx ? 'w-5 h-1.5 bg-wine-600' : 'w-1.5 h-1.5 bg-app-border hover:bg-app-text3'}`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={goPrev}
                disabled={stepIdx === 0}
                className="flex-1 py-2.5 rounded-xl border border-app-border text-sm font-medium text-app-text2 hover:bg-app-bg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ← Anterior
              </button>
              <button
                onClick={goNext}
                className="flex-1 py-2.5 rounded-xl bg-wine-600 hover:bg-wine-700 text-white text-sm font-semibold transition-all shadow-sm"
              >
                {isLast ? 'Concluir ✓' : 'Próximo →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
