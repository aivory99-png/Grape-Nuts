'use client'

import { useState, useEffect, useCallback, useRef, startTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import GrapesNutsLogo from '@/components/logo'

const STORAGE_KEY = (uid?: string) => `gn_guided_tour_seen_v1_${uid ?? 'anon'}`

/* ── Icons ── */
function Icon({ d, size = 22 }: { d: string | string[]; size?: number }) {
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

/* ── Types ── */
type TourCtx = { firstName: string; wineCount: number; clientCount: number }

type StepConfig = {
  isIntro?: true
  page: string
  selector: string
  icon: keyof typeof ICONS
  gradient: string
  iconBg: string
  dot: string
  subtitle: string
  title: string
  body: (ctx: TourCtx) => string
  tips: (ctx: TourCtx) => string[]
}

type Rect = { top: number; left: number; width: number; height: number }

/* ── Step 0: intro splash (no spotlight) ── */
const INTRO_STEP: StepConfig = {
  isIntro: true,
  page: '/dashboard',
  selector: '',
  icon: 'chart',
  gradient: '',
  iconBg: '', dot: '',
  subtitle: '',
  title: '',
  body: () => '',
  tips: () => [],
}

/* ── Steps 1–7: interactive spotlight ── */
const SPOTLIGHT_STEPS: StepConfig[] = [
  {
    page: '/dashboard',
    selector: '[data-tour="kpi-cards"]',
    icon: 'chart',
    gradient: 'from-slate-800 to-slate-700',
    iconBg: 'bg-blue-500/20', dot: 'bg-blue-400',
    subtitle: 'O seu negócio de relance',
    title: 'Painel Finanças',
    body: ({ firstName }) =>
      `${firstName}, aqui você vê tudo o que importa sem abrir o Excel — receita do mês, pedidos em aberto, cobranças vencidas e pagamentos recebidos, tudo em tempo real.`,
    tips: () => [
      'Os números atualizam automaticamente a cada pedido registrado',
      'Use os filtros rápidos: Este mês / Próximo mês / Este ano',
      'Clique em qualquer cartão para explorar o detalhe',
    ],
  },
  {
    page: '/dashboard',
    selector: '[data-tour="revenue-chart"]',
    icon: 'chart',
    gradient: 'from-blue-900 to-blue-700',
    iconBg: 'bg-sky-400/20', dot: 'bg-sky-400',
    subtitle: 'Evolução mensal das vendas',
    title: 'Gráfico de Receita',
    body: () =>
      'O gráfico de barras resume a sua receita mês a mês. Clique numa barra e todos os pedidos daquele mês aparecem instantaneamente abaixo — filtragem com um clique.',
    tips: () => [
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
    iconBg: 'bg-teal-500/20', dot: 'bg-teal-400',
    subtitle: 'Pagamentos pendentes e histórico',
    title: 'Pedidos & Cobranças',
    body: () =>
      'Todos os seus pedidos num só lugar — sem tabelas separadas. Expanda qualquer linha para registar o envio com código de rastreio e marcar pagamentos como recebidos.',
    tips: () => [
      'Expanda o pedido → aba Envio para registrar o rastreio',
      'Aba Cobrança → marque cada pagamento como Pago com a data',
      'O status (Enviado / Pago) atualiza automaticamente',
    ],
  },
  {
    page: '/dashboard/estoque',
    selector: '[data-tour="add-stock-btn"]',
    icon: 'stock',
    gradient: 'from-purple-900 to-purple-700',
    iconBg: 'bg-purple-500/20', dot: 'bg-purple-400',
    subtitle: 'Controle total dos seus vinhos',
    title: 'Estoque',
    body: ({ wineCount }) =>
      wineCount > 0
        ? `Os seus ${wineCount} vinhos já estão carregados e prontos para usar! Quando receber nova mercadoria, "+ Novo Produto" registra a entrada com preço de compra e quantidade.`
        : 'Os seus vinhos estão aqui, prontos para usar! Quando receber nova mercadoria, "+ Novo Produto" registra a entrada com preço de compra e quantidade.',
    tips: () => [
      'O estoque desconta automaticamente em cada pedido confirmado',
      '"Repor" adiciona unidades a um vinho já existente',
      'Alterne entre vista Board e Lista para ver os vinhos',
    ],
  },
  {
    page: '/dashboard/clientes',
    selector: '[data-tour="client-list"]',
    icon: 'clients',
    gradient: 'from-emerald-800 to-emerald-700',
    iconBg: 'bg-emerald-500/20', dot: 'bg-emerald-400',
    subtitle: 'Ativos · Prospects',
    title: 'Clientes',
    body: ({ clientCount }) =>
      clientCount > 0
        ? `Os seus ${clientCount} clientes e prospects já estão aqui. Clique em qualquer um para ver o histórico completo de pedidos, volume comprado e contato.`
        : 'Todos os seus clientes e prospects num só lugar. Clique em qualquer um para ver o histórico completo de pedidos, volume e contato.',
    tips: () => [
      'Clique num cliente para ver a ficha e o histórico de pedidos',
      'Use o pódio no topo para identificar os clientes mais valiosos',
      'Use "+ Novo Cliente" para adicionar novos clientes',
    ],
  },
  {
    page: '/dashboard/vendas',
    selector: '[data-tour="sales-form"]',
    icon: 'cart',
    gradient: 'from-orange-800 to-orange-700',
    iconBg: 'bg-orange-500/20', dot: 'bg-orange-400',
    subtitle: 'Registrar pedido recebido do cliente',
    title: 'Novo Pedido',
    body: ({ firstName }) =>
      `${firstName}, registrar um pedido leva menos de 1 minuto: selecione o cliente, escolha os vinhos — o preço preenche automaticamente. Mais rápido que qualquer Excel!`,
    tips: () => [
      'A data do pedido é editável — registre também vendas passadas',
      'O tipo "Prospect (brinde)" não gera cobrança pendente',
      'Você pode adicionar vários vinhos no mesmo pedido',
    ],
  },
  {
    page: '/dashboard/configuracoes',
    selector: '[data-tour="profile-section"]',
    icon: 'settings',
    gradient: 'from-zinc-800 to-zinc-700',
    iconBg: 'bg-zinc-500/20', dot: 'bg-zinc-400',
    subtitle: 'Conta e preferências',
    title: 'Configurações',
    body: () =>
      'Atualize o seu perfil e preferências. Se no futuro tiver uma equipe de vendas, basta adicionar vendedores aqui — eles recebem acesso imediato com o próprio e-mail.',
    tips: () => [
      'Os vendedores recebem acesso com e-mail e senha próprios',
      'Mude o idioma (PT/ES) em qualquer momento no menu lateral',
      'A equipe da DeTech está sempre disponível para ajudar',
    ],
  },
]

/* All steps: intro + spotlights */
const ALL_STEPS: StepConfig[] = [INTRO_STEP, ...SPOTLIGHT_STEPS]

/* ── Helpers ── */
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
  userName,
  skipAutoOpen,
}: {
  onOpen?: (fn: () => void) => void
  userId?: string
  userName?: string
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
  const [wineCount,  setWineCount]  = useState(0)
  const [clientCount,setClientCount]= useState(0)

  const overlayRef = useRef<HTMLDivElement>(null)
  const cardRef    = useRef<HTMLDivElement>(null)

  const firstName = (userName ?? 'Paulo').split(' ')[0]
  const ctx: TourCtx = { firstName, wineCount, clientCount }

  /* fetch real stats */
  useEffect(() => {
    const sb = createClient()
    Promise.all([
      sb.from('wines').select('id', { count: 'exact', head: true }),
      sb.from('clients').select('id', { count: 'exact', head: true }),
    ]).then(([w, c]) => {
      if (w.count != null) setWineCount(w.count)
      if (c.count != null) setClientCount(c.count)
    })
  }, [])

  const openTour = useCallback(() => {
    setStepIdx(0); setActive(true); setNavigating(false)
    setTargetRect(null); setCardPos(null)
  }, [])
  useEffect(() => { onOpen?.(openTour) }, [onOpen, openTour])

  useEffect(() => {
    if (skipAutoOpen) return
    if (!localStorage.getItem(STORAGE_KEY(userId))) {
      const t = setTimeout(() => setActive(true), 700)
      return () => clearTimeout(t)
    }
  }, [userId, skipAutoOpen])

  const stepCfg = ALL_STEPS[stepIdx]
  const isIntro = !!stepCfg.isIntro
  const TOTAL   = ALL_STEPS.length

  /* navigate */
  useEffect(() => {
    if (!active || isIntro) return
    if (pathname !== stepCfg.page) {
      startTransition(() => { setNavigating(true); setTargetRect(null); setCardPos(null) })
      router.push(stepCfg.page)
    } else {
      startTransition(() => setNavigating(false))
    }
  }, [active, stepIdx, stepCfg.page, isIntro, pathname, router])

  /* find element */
  useEffect(() => {
    if (!active || isIntro || navigating || pathname !== stepCfg.page) return
    let cancelled = false
    ;(async () => {
      const el = await waitForElement(stepCfg.selector)
      if (cancelled) return
      if (!el) { setTargetRect(null); return }
      const r = el.getBoundingClientRect()
      const PAD = 10
      setTargetRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
      if (r.top < 80 || r.bottom > window.innerHeight - 80)
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })()
    return () => { cancelled = true }
  }, [active, isIntro, navigating, stepIdx, stepCfg.selector, stepCfg.page, pathname])

  /* position tooltip */
  useEffect(() => {
    if (!targetRect || !cardRef.current) { setCardPos(null); return }
    const vw = window.innerWidth, vh = window.innerHeight
    const CARD_W = Math.min(340, vw - 24)
    const MARGIN = 14
    const CARD_H = cardRef.current.offsetHeight || 420
    const below  = vh - (targetRect.top + targetRect.height)
    const above  = targetRect.top
    const toRight = vw - (targetRect.left + targetRect.width)
    const toLeft  = targetRect.left
    const centerH = clamp(targetRect.left + targetRect.width / 2 - CARD_W / 2, 12, vw - CARD_W - 12)
    let top: number, left: number
    if (below >= CARD_H + MARGIN) {
      top  = targetRect.top + targetRect.height + MARGIN
      left = centerH
    } else if (above >= CARD_H + MARGIN) {
      top  = targetRect.top - CARD_H - MARGIN
      left = centerH
    } else if (toRight >= CARD_W + MARGIN) {
      left = targetRect.left + targetRect.width + MARGIN
      top  = clamp(targetRect.top + targetRect.height / 2 - CARD_H / 2, 8, vh - CARD_H - 8)
    } else if (toLeft >= CARD_W + MARGIN) {
      left = targetRect.left - CARD_W - MARGIN
      top  = clamp(targetRect.top + targetRect.height / 2 - CARD_H / 2, 8, vh - CARD_H - 8)
    } else {
      // element fills most of screen — center card over it
      top  = clamp(vh / 2 - CARD_H / 2, 8, vh - CARD_H - 8)
      left = clamp(vw / 2 - CARD_W / 2, 12, vw - CARD_W - 12)
    }
    setCardPos({ top: clamp(top, 8, vh - CARD_H - 8), left })
  }, [targetRect])

  function close() {
    setActive(false); setTargetRect(null); setNavigating(false); setCardPos(null)
    localStorage.setItem(STORAGE_KEY(userId), '1')
  }

  function goTo(idx: number) {
    if (animating || idx < 0 || idx >= ALL_STEPS.length) return
    setAnimDir(idx > stepIdx ? 'next' : 'prev')
    setAnimating(true)
    setTimeout(() => { setStepIdx(idx); setTargetRect(null); setCardPos(null); setAnimating(false) }, 180)
  }

  if (!active) return null

  const isLast = stepIdx === TOTAL - 1
  const vw = typeof window !== 'undefined' ? window.innerWidth  : 1440
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  const cx = targetRect && !isIntro
    ? { x: targetRect.left, y: targetRect.top, w: targetRect.width, h: targetRect.height, r: 14 }
    : null

  /* ── Render intro splash ── */
  if (isIntro) {
    return (
      <>
        <div
          className="fixed inset-0 z-[9900] flex items-center justify-center p-5"
          style={{ background: 'rgba(10,5,18,0.85)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="gn-fade-up w-full rounded-3xl shadow-2xl overflow-hidden bg-app-surface"
            style={{ maxWidth: 480 }}
          >
            {/* Header */}
            <div
              className="relative px-8 pt-10 pb-8 text-center overflow-hidden"
              style={{ background: 'linear-gradient(145deg, #1a0a24 0%, #3b0f2f 45%, #7c1d45 100%)' }}
            >
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, #c2185b, transparent)' }} />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, #9c27b0, transparent)' }} />

              {/* Close */}
              <button onClick={close}
                className="absolute top-3 right-3 text-white/30 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                aria-label="Fechar">
                <Icon d={ICONS.close} size={15} />
              </button>

              <div className="relative">
                <div className="flex justify-center mb-5">
                  <div style={{ mixBlendMode: 'lighten' }}>
                    <GrapesNutsLogo size="md" />
                  </div>
                </div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-semibold text-white/70 tracking-wide">TUDO FUNCIONANDO</span>
                </div>
                <h2 className="text-white text-2xl font-bold leading-tight mb-1">
                  {firstName}, a sua plataforma<br />está pronta! 🎉
                </h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Grape&Nuts · implementado pela DeTech
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 pt-6 pb-2 space-y-5">

              {/* Message */}
              <p className="text-sm leading-relaxed text-app-text">
                Sabemos que vir do Excel pode parecer avassalador —
                mas não se preocupe. A equipe da <span className="font-semibold text-app-text">DeTech</span> configurou
                e implementou tudo com cuidado, exatamente como você pediu.
              </p>

              {/* Data pills */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { emoji: '🍷', label: wineCount > 0 ? `${wineCount} vinhos` : 'Vinhos', sub: 'carregados e prontos' },
                  { emoji: '🤝', label: clientCount > 0 ? `${clientCount} clientes` : 'Clientes', sub: 'registrados e ativos' },
                  { emoji: '📦', label: 'Estoque',   sub: 'configurado e ativo' },
                  { emoji: '💸', label: 'Cobranças', sub: 'integradas nos pedidos' },
                ].map((item, i) => (
                  <div key={i}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{ background: 'rgba(159,18,57,0.06)', border: '1px solid rgba(159,18,57,0.12)' }}
                  >
                    <span className="text-xl flex-shrink-0">{item.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-app-text leading-none mb-0.5">{item.label}</p>
                      <p className="text-[11px] text-app-text3 leading-none">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* DeTech promise */}
              <div
                className="rounded-2xl px-4 py-3.5 flex gap-3"
                style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)' }}
              >
                <span className="text-lg flex-shrink-0 mt-0.5">💬</span>
                <p className="text-[13px] text-app-text2 leading-relaxed">
                  A equipe da <span className="font-semibold text-app-text">DeTech</span> está
                  aqui para implementar o que você precisar e responder a qualquer dúvida.
                  Este tour mostra cada parte da plataforma em menos de 3 minutos.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-8 pb-6 pt-5 space-y-2">
              <button
                onClick={() => goTo(1)}
                className="w-full py-4 rounded-2xl text-white text-sm font-bold transition-all shadow-lg active:scale-[.98] flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #9f1239 0%, #be123c 100%)' }}
              >
                <span>Começar o tour</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <button
                onClick={close}
                className="w-full py-2.5 rounded-2xl text-sm text-app-text3 hover:text-app-text transition-colors"
              >
                Explorar por conta própria
              </button>
            </div>

            {/* Footer */}
            <div className="px-8 pb-5 text-center">
              <p className="text-[11px] text-app-text3">
                Feito com cuidado pelo time da{' '}
                <span className="font-semibold text-app-text2">DeTech</span>
                {' '}para o <span className="font-medium text-app-text2">Grape&Nuts</span>
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  /* ── Render spotlight steps ── */
  const pos = cardPos ?? { top: vh / 2 - 230, left: vw / 2 - 170 }
  const resolvedBody = stepCfg.body(ctx)
  const resolvedTips = stepCfg.tips(ctx)

  return (
    <>
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
              {cx && <rect x={cx.x} y={cx.y} width={cx.w} height={cx.h} rx={cx.r} ry={cx.r} fill="black" />}
            </mask>
          </defs>
          <rect width={vw} height={vh} fill="rgba(0,0,0,0.82)" mask="url(#gn-cutout-mask)" />
          {cx && (
            <rect
              className="gn-ring"
              x={cx.x - 3} y={cx.y - 3} width={cx.w + 6} height={cx.h + 6}
              rx={cx.r + 3} ry={cx.r + 3}
              fill="none" stroke="#9F1239" strokeWidth="2.5"
              style={{ transformOrigin: `${cx.x + cx.w / 2}px ${cx.y + cx.h / 2}px` }}
            />
          )}
        </svg>

        {/* Navigating */}
        {navigating && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
            <div className="bg-app-surface rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3 max-w-xs text-center">
              <div className="w-8 h-8 rounded-full border-2 border-wine-200 border-t-wine-600 animate-spin" />
              <p className="text-sm font-medium text-app-text">
                A navegar para <span className="font-bold">{stepCfg.title}</span>…
              </p>
            </div>
          </div>
        )}

        {/* Tooltip card */}
        {!navigating && (
          <div
            ref={cardRef}
            className="absolute rounded-3xl shadow-2xl overflow-hidden bg-app-surface"
            style={{ width: 340, top: pos.top, left: pos.left, zIndex: 9910, pointerEvents: 'auto' }}
          >
            {/* Gradient header */}
            <div className={`bg-gradient-to-br ${stepCfg.gradient} px-6 pt-6 pb-7 relative`}>
              <button onClick={close}
                className="absolute top-3 right-3 text-white/40 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                aria-label="Fechar tour">
                <Icon d={ICONS.close} size={15} />
              </button>

              <div
                className="transition-all duration-200"
                style={{
                  opacity: animating ? 0 : 1,
                  transform: animating ? (animDir === 'next' ? 'translateX(16px)' : 'translateX(-16px)') : 'none',
                }}
              >
                <div className={`${stepCfg.iconBg} w-11 h-11 rounded-2xl flex items-center justify-center mb-3 text-white`}>
                  <Icon d={ICONS[stepCfg.icon]} size={22} />
                </div>
                <p className="text-white/55 text-[10px] font-semibold uppercase tracking-widest mb-0.5">{stepCfg.subtitle}</p>
                <h2 className="text-white text-xl font-bold leading-tight">{stepCfg.title}</h2>
              </div>

              {/* Progress dots — skip intro dot (index 0) */}
              <div className="flex gap-1.5 mt-4">
                {SPOTLIGHT_STEPS.map((_, i) => {
                  const realIdx = i + 1
                  return (
                    <button
                      key={i}
                      onClick={() => goTo(realIdx)}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        background: realIdx === stepIdx ? 'white' : 'rgba(255,255,255,0.28)',
                        width: realIdx === stepIdx ? '20px' : '6px',
                      }}
                    />
                  )
                })}
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 transition-all duration-200" style={{ opacity: animating ? 0 : 1 }}>
              <p className="text-app-text text-sm leading-relaxed mb-4">{resolvedBody}</p>
              <ul className="space-y-2.5">
                {resolvedTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`${stepCfg.dot} text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5`}>
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
                disabled={stepIdx <= 1}
                className="px-3 py-2 text-sm text-app-text2 hover:text-app-text disabled:opacity-0 disabled:pointer-events-none transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-[11px] text-app-text3 font-mono tabular-nums">
                {stepIdx} / {TOTAL - 1}
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
