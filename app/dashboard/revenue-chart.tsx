'use client'

import { useState, useEffect } from 'react'
import { getAllWinePhotos } from '@/lib/wine-photos'

export type ChartWine = { name: string; color: string; monthRevenues: number[]; wineId?: string }

const fmtCompact = (n: number) =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
const fmtFull = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
const fmtMono = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

export default function RevenueChart({
  months,
  wines,
  totals,
  lang,
  clientSeries = [],
  avgRevenue = 0,
  yearTotal = 0,
  selectedIndices = [],
  allTotals,
  onBarClick,
}: {
  months: string[]
  wines: ChartWine[]
  totals: number[]
  lang: string
  clientSeries?: ChartWine[]
  avgRevenue?: number
  yearTotal?: number
  selectedIndices?: number[]
  allTotals?: number[]
  onBarClick?: (idx: number) => void
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [hoveredSegment, setHoveredSegment] = useState<{ mi: number; name: string } | null>(null)
  const [view, setView] = useState<'wines' | 'clients'>('wines')
  const [winePhotos, setWinePhotos] = useState<Record<string, string>>({})
  const [highlightedSeries, setHighlightedSeries] = useState<string | null>(null)

  useEffect(() => {
    function load() { setWinePhotos(getAllWinePhotos()) }
    load()
    window.addEventListener('wine:photos-changed', load)
    return () => window.removeEventListener('wine:photos-changed', load)
  }, [])

  const series = view === 'wines' ? wines : clientSeries
  // Use allTotals for scale so bars don't resize when selection changes
  const scaleTotals = allTotals ?? totals
  const maxTotal = Math.max(...scaleTotals, 1)
  const BAR_H = 180
  const hasData = (allTotals ?? totals).some(t => t > 0)
  const hasSelection = selectedIndices.length > 0

  // Avg line uses allTotals-based max so it stays stable
  const displayAvg = avgRevenue
  const avgLineY = displayAvg > 0
    ? Math.max(2, Math.min((1 - displayAvg / maxTotal) * BAR_H, BAR_H - 2))
    : null

  const seriesTotals = series.map(s => s.monthRevenues.reduce((a, b) => a + b, 0))
  const yearlyProjection = avgRevenue * 12

  const viewLabel = (v: 'wines' | 'clients') =>
    v === 'wines' ? (lang === 'pt' ? 'Vinhos' : 'Vinos') : 'Clientes'

  return (
    <div className="rounded-2xl overflow-hidden border border-app-border bg-app-card flex flex-col md:flex-row" style={{ minHeight: 220 }}>

      {/* ── LEFT: KPI panel ── */}
      <div className="md:w-48 flex-shrink-0 bg-app-bg/60 border-b md:border-b-0 md:border-r border-app-border px-5 py-5 flex flex-col justify-between gap-4">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-app-text3 mb-2">
            {lang === 'pt' ? 'Receita mensal média' : 'Ingreso mensual promedio'}
          </div>
          <div className="font-mono text-2xl font-bold text-app-text tabular-nums leading-none">
            {fmtCompact(avgRevenue)}
          </div>
          <div className="text-[10px] text-app-text3 mt-0.5">
            {lang === 'pt' ? 'BRL /mês' : 'BRL /mes'}
          </div>
          {yearTotal > 0 && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-app-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-wine-500"
                  style={{ width: `${Math.min(100, Math.round((avgRevenue / maxTotal) * 100))}%` }}
                />
              </div>
              <div className="text-[9px] text-app-text3 mt-1 tabular-nums">
                {lang === 'pt' ? 'máx' : 'máx'} {fmtCompact(maxTotal)} {lang === 'pt' ? '/mês' : '/mes'}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-app-text3 mb-2">
            {lang === 'pt' ? 'Total acumulado' : 'Total acumulado'}
          </div>
          <div className="font-mono text-xl font-bold text-app-text tabular-nums leading-none">
            {fmtCompact(yearTotal)}
          </div>
          <div className="text-[10px] text-app-text3 mt-0.5">BRL /12 meses</div>
          {yearlyProjection > 0 && (
            <div className="mt-2 text-[9px] text-app-text3 tabular-nums">
              ~{fmtCompact(yearlyProjection)} BRL {lang === 'pt' ? '/ano proj.' : '/año proy.'}
            </div>
          )}
        </div>

      </div>

      {/* ── CENTER: chart ── */}
      <div className="flex-1 min-w-0 px-5 py-5">
        <div className="text-[9px] font-bold uppercase tracking-widest text-app-text3 mb-3">
          {lang === 'pt' ? 'Receita por mês' : 'Ingresos por mes'} · {viewLabel(view)}
        </div>

        <div className="relative" style={{ height: `${BAR_H}px` }}>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map(pct => (
            <div
              key={pct}
              className="absolute left-0 right-0 border-t border-app-border/20"
              style={{ top: `${Math.round((1 - pct) * BAR_H)}px` }}
            />
          ))}

          {/* Avg reference line */}
          {avgLineY !== null && hasData && (
            <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: `${avgLineY}px` }}>
              <div className="relative border-t-2 border-dashed border-wine-400/60">
                <span className="absolute left-1 -top-4 text-[9px] font-mono font-bold text-wine-400 bg-app-card border border-wine-400/30 px-1.5 py-0.5 rounded-md leading-none whitespace-nowrap">
                  {lang === 'pt' ? 'méd.' : 'prom.'} {fmtCompact(displayAvg)}
                </span>
              </div>
            </div>
          )}

          {/* Max reference line — only show when different from avg */}
          {hasData && Math.abs(maxTotal - displayAvg) > maxTotal * 0.02 && (
            <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: 0 }}>
              <div className="relative border-t border-dashed border-app-text3/25">
                <span className="absolute right-1 -top-4 text-[9px] font-mono text-app-text3 bg-app-card border border-app-border/60 px-1.5 py-0.5 rounded-md leading-none whitespace-nowrap">
                  máx {fmtCompact(maxTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Bars */}
          <div className="absolute inset-0 flex items-end gap-1">
            {months.map((label, mi) => {
              const rawTotal = (allTotals ?? totals)[mi] ?? 0
              const total = totals[mi] ?? 0
              const barH = rawTotal > 0 ? Math.max((rawTotal / maxTotal) * BAR_H, 4) : 2
              const isHov = hovered === mi
              const isSelected = !hasSelection || selectedIndices.includes(mi)
              const isDimmed = hasSelection && !selectedIndices.includes(mi)

              return (
                <div
                  key={label}
                  className="flex-1 relative h-full flex flex-col items-center justify-end"
                  style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                  onMouseEnter={() => setHovered(mi)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onBarClick?.(mi)}
                >
                  <div
                    className={`w-full rounded-t overflow-hidden flex flex-col-reverse transition-all duration-150 ${isHov ? 'brightness-110 scale-y-[1.02] origin-bottom' : ''}`}
                    style={{
                      height: `${barH}px`,
                      opacity: isDimmed ? 0.25 : 1,
                      outline: isSelected && hasSelection ? '2px solid rgba(160,40,144,0.5)' : 'none',
                      outlineOffset: '1px',
                    }}
                  >
                    {series.length > 0 && total > 0
                      ? series.map(s => {
                          const rev = s.monthRevenues[mi] ?? 0
                          if (rev === 0) return null
                          const dimmed = highlightedSeries !== null && highlightedSeries !== s.name
                          const isSegHov = hoveredSegment?.mi === mi && hoveredSegment?.name === s.name
                          return (
                            <div
                              key={s.name}
                              style={{
                                height: `${(rev / total) * 100}%`,
                                backgroundColor: s.color,
                                flexShrink: 0,
                                opacity: dimmed ? 0.12 : isSegHov ? 1 : 1,
                                filter: isSegHov ? 'brightness(1.25)' : undefined,
                                transition: 'opacity 0.15s, filter 0.1s',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                e.stopPropagation()
                                setHoveredSegment({ mi, name: s.name })
                                setHovered(mi)
                              }}
                              onMouseLeave={(e) => {
                                e.stopPropagation()
                                setHoveredSegment(null)
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setHighlightedSeries(prev => prev === s.name ? null : s.name)
                              }}
                            />
                          )
                        })
                      : <div className="w-full h-full rounded-t" style={{ backgroundColor: '#6b7280', opacity: 0.3 }} />
                    }
                  </div>
                </div>
              )
            })}
          </div>

          {/* Tooltip — segment-focused when hoveredSegment is set, column-wide otherwise */}
          {hovered !== null && (() => {
            const mi = hovered
            const rawTotal = (allTotals ?? totals)[mi] ?? 0
            if (rawTotal === 0) return null
            const label = months[mi]
            const anchorRight = mi >= months.length / 2
            const leftPct = ((mi + 0.5) / months.length) * 100
            const focusedName = hoveredSegment?.mi === mi ? hoveredSegment.name : null
            const visibleSeries = focusedName
              ? series.filter(s => s.name === focusedName)
              : series
            return (
              <div
                className="absolute top-1 z-30 pointer-events-none"
                style={{
                  left: `${leftPct}%`,
                  transform: anchorRight ? 'translateX(calc(-100% - 4px))' : 'translateX(4px)',
                }}
              >
                <div
                  className="rounded-xl border shadow-2xl overflow-hidden text-[11px]"
                  style={{ background: '#18181b', borderColor: '#3f3f46', minWidth: 176 }}
                >
                  <div className="px-3 py-2 border-b flex items-center justify-between gap-2" style={{ borderColor: '#3f3f46' }}>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{label}</span>
                    {focusedName && (
                      <span className="text-[9px] text-zinc-500">
                        {lang === 'pt' ? 'clique para isolar' : 'clic para aislar'}
                      </span>
                    )}
                  </div>
                  {visibleSeries.map(s => {
                    const rev = s.monthRevenues[mi] ?? 0
                    if (rev === 0) return null
                    const pct = Math.round((rev / rawTotal) * 100)
                    return (
                      <div
                        key={s.name}
                        className="flex items-center gap-2 px-3 py-1.5"
                      >
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-zinc-300 truncate flex-1 text-[10px]" style={{ maxWidth: 96 }}>{s.name}</span>
                        <span className="font-mono font-bold text-white whitespace-nowrap text-[11px]">{fmtCompact(rev)}</span>
                        <span className="text-zinc-500 text-[9px] w-7 text-right flex-shrink-0">{pct}%</span>
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between gap-3 px-3 py-2 border-t" style={{ borderColor: '#3f3f46' }}>
                    <span className="text-[10px] font-semibold text-zinc-400">Total</span>
                    <span className="font-mono font-bold text-white text-[12px]">{fmtFull(focusedName ? (series.find(s => s.name === focusedName)?.monthRevenues[mi] ?? 0) : rawTotal)}</span>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Month labels */}
        <div className="flex gap-1 mt-1">
          {months.map((label, mi) => {
            const rawTotal = (allTotals ?? totals)[mi] ?? 0
            const isHov = hovered === mi
            const isSelected = hasSelection && selectedIndices.includes(mi)
            const active = isHov || isSelected
            return (
              <div
                key={label}
                className={`flex-1 flex flex-col items-center gap-0.5 rounded-md py-1 transition-colors select-none ${onBarClick ? 'cursor-pointer' : ''} ${isHov ? 'bg-app-bg/60' : ''}`}
                onMouseEnter={() => setHovered(mi)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onBarClick?.(mi)}
              >
                <span className={`text-[8px] text-center truncate w-full leading-none transition-colors ${active ? 'text-app-text font-bold' : 'text-app-text3'}`}>
                  {label}
                </span>
                <span className={`text-[9px] font-mono font-bold tabular-nums leading-none transition-opacity ${active && rawTotal > 0 ? 'opacity-100 text-wine-500' : 'opacity-0'}`}>
                  {rawTotal > 0 ? fmtCompact(rawTotal) : ' '}
                </span>
              </div>
            )
          })}
        </div>

        {!hasData && (
          <p className="text-center text-xs text-app-text3 mt-4">
            {lang === 'pt' ? 'Nenhuma venda registrada ainda.' : 'Sin ventas registradas aún.'}
          </p>
        )}
      </div>

      {/* ── RIGHT: legend ── */}
      {series.length > 0 && hasData && (
        <div className="md:w-52 flex-shrink-0 border-t md:border-t-0 md:border-l border-app-border px-4 py-5 overflow-y-auto flex flex-col gap-3">
          {/* Legend header: label + view toggle */}
          <div className="flex flex-col gap-2">
            <div className="text-[9px] font-bold uppercase tracking-widest text-app-text3">
              {view === 'wines'
                ? (lang === 'pt' ? 'Por produto' : 'Por producto')
                : (lang === 'pt' ? 'Por cliente' : 'Por cliente')}
            </div>
            <div className="flex rounded-xl border border-app-border overflow-hidden">
              {(['wines', 'clients'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => { setView(v); setHighlightedSeries(null) }}
                  className={`flex-1 text-[10px] font-semibold px-2 py-1.5 transition-colors ${
                    view === v
                      ? 'bg-wine-600 text-white'
                      : 'bg-app-bg text-app-text3 hover:text-app-text'
                  } ${v === 'clients' ? 'border-l border-app-border' : ''}`}
                >
                  {viewLabel(v)}
                </button>
              ))}
            </div>
          </div>

          {/* Legend items — clickable to highlight */}
          <div className="space-y-1.5">
            {series.map((s, i) => {
              const total = seriesTotals[i] ?? 0
              if (total === 0) return null
              const photo = (view === 'wines' && s.wineId) ? winePhotos[s.wineId] : undefined
              const isHighlighted = highlightedSeries === s.name
              const isDimmedItem = highlightedSeries !== null && !isHighlighted
              return (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setHighlightedSeries(prev => prev === s.name ? null : s.name)}
                  className={`w-full flex items-center gap-2.5 px-1.5 py-1 rounded-lg text-left transition-all ${
                    isHighlighted
                      ? 'bg-app-bg ring-1 ring-app-border'
                      : 'hover:bg-app-bg/60'
                  }`}
                  style={{ opacity: isDimmedItem ? 0.4 : 1 }}
                >
                  {photo
                    ? <img src={photo} className="w-3 h-3 rounded-full object-cover flex-shrink-0 border border-app-border" alt="" />
                    : <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                  }
                  <span className="text-[11px] text-app-text2 flex-1 truncate">{s.name}</span>
                  <span className="text-[11px] font-mono font-semibold text-app-text tabular-nums flex-shrink-0">
                    {fmtMono(total)}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Legend avg line indicator */}
          {avgRevenue > 0 && (
            <div className="mt-auto pt-3 border-t border-app-border">
              <div className="flex items-center gap-2 text-[9px] text-wine-400">
                <div className="w-4 border-t border-dashed border-wine-400" />
                <span>{lang === 'pt' ? 'méd.' : 'prom.'} {fmtCompact(avgRevenue)}/{lang === 'pt' ? 'mês' : 'mes'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
