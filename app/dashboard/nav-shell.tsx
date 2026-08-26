'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useCallback, useState, useEffect } from 'react'
import { logout } from '@/app/login/actions'
import LangToggle from '@/components/lang-toggle'
import ThemeToggle from '@/components/theme-toggle'
import GrapesNutsLogo from '@/components/logo'
import GuidedTour from '@/components/guided-tour'
import GettingStartedPanel from '@/components/getting-started-panel'
import WelcomeModal from '@/components/welcome-modal'
import type { UserProfile } from '@/lib/types'
import type { Lang } from '@/lib/i18n'
import type { Theme } from '@/lib/theme'
import { t } from '@/lib/i18n'

function Icon({ d, size = 18 }: { d: string | string[]; size?: number }) {
  const paths = Array.isArray(d) ? d : [d]
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

const ICONS = {
  home:     'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  clients:  ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2','M23 21v-2a4 4 0 00-3-3.87','M16 3.13a4 4 0 010 7.75'],
  money:    ['M12 1v22','M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'],
  stock:    ['M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z','M3.27 6.96L12 12.01l8.73-5.05','M12 22.08V12'],
  settings: ['M12 15a3 3 0 100-6 3 3 0 000 6z','M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z'],
  cart:     ['M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z','M3 6h18','M16 10a4 4 0 01-8 0'],
  logout:   ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4','M16 17l5-5-5-5','M21 12H9'],
}

export default function NavShell({
  children,
  user,
  lang,
  theme,
}: {
  children: React.ReactNode
  user: UserProfile | null
  lang: Lang
  theme: Theme
}) {
  const pathname  = usePathname()
  const [gsOpen, setGsOpen] = useState(false)
  const openTourRef = useRef<() => void>(() => {})
  const registerOpen = useCallback((fn: () => void) => { openTourRef.current = fn }, [])
  const [welcomeSeen, setWelcomeSeen] = useState(true) // default true to avoid flash

  useEffect(() => {
    const key = `gn_welcome_v1_${user?.id ?? 'anon'}`
    setWelcomeSeen(!!localStorage.getItem(key))
  }, [user?.id])

  function handleStartTour() {
    setWelcomeSeen(true)
    setTimeout(() => openTourRef.current(), 100)
  }

  const navItems = [
    { href: '/dashboard',              label: t('nav_dashboard', lang), iconKey: 'home' as const },
    { href: '/dashboard/clientes',     label: t('nav_clients', lang),   iconKey: 'clients' as const },
    { href: '/dashboard/estoque',      label: t('nav_stock', lang),     iconKey: 'stock' as const },
    { href: '/dashboard/configuracoes',label: t('nav_settings', lang),  iconKey: 'settings' as const },
  ]

  const bottomItems = [
    { href: '/dashboard',          label: t('nav_dashboard', lang), iconKey: 'home' as const },
    { href: '/dashboard/clientes', label: t('nav_clients', lang),   iconKey: 'clients' as const },
    { href: '/dashboard/vendas',   label: t('nav_new_sale', lang),  iconKey: 'cart' as const },
    { href: '/dashboard/estoque',  label: t('nav_stock', lang),     iconKey: 'stock' as const },
  ]

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <>
    <GuidedTour
      onOpen={registerOpen}
      userId={user?.id}
      userName={user?.name}
      skipAutoOpen={!welcomeSeen}
    />
    <GettingStartedPanel open={gsOpen} onClose={() => setGsOpen(false)} lang={lang} />
    <div className="flex h-screen bg-app-bg overflow-hidden">
      {/* ── SIDEBAR (desktop) ── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col bg-white border-r border-app-border">
        {/* Brand */}
        <div className="px-3 py-3 border-b border-app-border flex items-center justify-center">
          <div className="bg-zinc-900 rounded-xl px-3 py-2 flex items-center justify-center">
            <GrapesNutsLogo size="md" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive(item.href)
                  ? 'bg-wine-50 text-wine-600'
                  : 'text-app-text2 hover:bg-app-bg'
                }`}
            >
              <Icon d={ICONS[item.iconKey]} />
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}

          {/* Nova Venda */}
          <Link
            href="/dashboard/vendas"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mt-2
              ${isActive('/dashboard/vendas')
                ? 'bg-wine-700 text-white'
                : 'bg-wine-600 text-white hover:bg-wine-700'
              }`}
          >
            <Icon d={ICONS.cart} />
            <span>{t('nav_new_sale', lang)}</span>
          </Link>

          {/* Divider */}
          <div className="pt-2 pb-1 px-1">
            <span className="text-[10px] font-semibold tracking-widest text-app-text3 uppercase">
              {lang === 'pt' ? 'Suporte' : 'Soporte'}
            </span>
          </div>

          {/* Getting Started */}
          <button
            onClick={() => setGsOpen(true)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
              ${gsOpen ? 'bg-wine-50 text-wine-600' : 'text-app-text2 hover:bg-app-bg'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 8 12 12 14 14"/>
            </svg>
            <span>{lang === 'pt' ? 'Primeiros passos' : 'Primeros pasos'}</span>
          </button>
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-app-border space-y-0.5">
          <LangToggle current={lang} />
          <ThemeToggle current={theme} />

          {/* Tour button */}
          <button
            onClick={() => openTourRef.current()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-app-text2 hover:bg-app-bg transition-all"
            title="Ver tutorial"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Ver tutorial</span>
          </button>

          {user && (
            <div className="px-3 py-2 flex items-center gap-2 mt-1">
              <div className="w-7 h-7 rounded-full bg-wine-100 text-wine-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-app-text truncate">{user.name}</div>
                <div className="text-xs text-app-text3 capitalize">{user.role}</div>
              </div>
            </div>
          )}

          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-app-text2 hover:bg-app-bg transition-all"
            >
              <Icon d={ICONS.logout} />
              <span>{t('nav_logout', lang)}</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </div>
      </main>

      {/* ── BOTTOM NAV (mobile) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-app-border z-50 flex">
        {bottomItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${active ? 'text-wine-600' : 'text-app-text3'}`}
            >
              <Icon d={ICONS[item.iconKey]} size={20} />
              <span className={`text-[9px] font-semibold uppercase tracking-wide`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>

    <WelcomeModal
      userId={user?.id}
      userName={user?.name}
      onStartTour={handleStartTour}
      onDismiss={() => setWelcomeSeen(true)}
    />
    </>
  )
}
