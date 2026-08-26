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
  home:    'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  clients: ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2','M23 21v-2a4 4 0 00-3-3.87','M16 3.13a4 4 0 010 7.75'],
  stock:   ['M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z','M3.27 6.96L12 12.01l8.73-5.05','M12 22.08V12'],
  cart:    ['M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z','M3 6h18','M16 10a4 4 0 01-8 0'],
  logout:  ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4','M16 17l5-5-5-5','M21 12H9'],
  settings:['M12 15a3 3 0 100-6 3 3 0 000 6z','M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'],
  help:    ['M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3','M12 17h.01','circle cx="12" cy="12" r="10"'],
  tour:    ['M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z'],
  chevron: 'M18 15l-6-6-6 6',
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
  const pathname     = usePathname()
  const [gsOpen,        setGsOpen]        = useState(false)
  const [userMenuOpen,  setUserMenuOpen]  = useState(false)
  const [welcomeSeen,   setWelcomeSeen]   = useState(true)

  const openTourRef  = useRef<() => void>(() => {})
  const userMenuRef  = useRef<HTMLDivElement>(null)
  const registerOpen = useCallback((fn: () => void) => { openTourRef.current = fn }, [])

  useEffect(() => {
    const key = `gn_welcome_v1_${user?.id ?? 'anon'}`
    setWelcomeSeen(!!localStorage.getItem(key))
  }, [user?.id])

  /* close user menu on outside click */
  useEffect(() => {
    if (!userMenuOpen) return
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [userMenuOpen])

  function handleStartTour() {
    setWelcomeSeen(true)
    setTimeout(() => openTourRef.current(), 100)
  }

  /* Main nav — Config removed, lives in user menu */
  const navItems = [
    { href: '/dashboard',          label: t('nav_dashboard', lang), iconKey: 'home'    as const },
    { href: '/dashboard/clientes', label: t('nav_clients', lang),   iconKey: 'clients' as const },
    { href: '/dashboard/estoque',  label: t('nav_stock', lang),     iconKey: 'stock'   as const },
  ]

  const bottomItems = [
    { href: '/dashboard',          label: t('nav_dashboard', lang), iconKey: 'home'    as const },
    { href: '/dashboard/clientes', label: t('nav_clients', lang),   iconKey: 'clients' as const },
    { href: '/dashboard/vendas',   label: t('nav_new_sale', lang),  iconKey: 'cart'    as const },
    { href: '/dashboard/estoque',  label: t('nav_stock', lang),     iconKey: 'stock'   as const },
  ]

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const menuItemCls = 'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-app-text2 hover:bg-app-bg hover:text-app-text transition-colors text-left'

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
        <div className="flex-shrink-0 flex items-center justify-center px-5 py-5 border-b border-zinc-800"
          style={{ background: 'linear-gradient(160deg, #111 0%, #1c0a14 100%)' }}>
          <GrapesNutsLogo size="md" />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive(item.href) ? 'bg-wine-50 text-wine-600' : 'text-app-text2 hover:bg-app-bg'}`}
            >
              <Icon d={ICONS[item.iconKey]} />
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}

          {/* Nova Venda */}
          <Link
            href="/dashboard/vendas"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mt-2
              ${isActive('/dashboard/vendas') ? 'bg-wine-700 text-white' : 'bg-wine-600 text-white hover:bg-wine-700'}`}
          >
            <Icon d={ICONS.cart} />
            <span>{t('nav_new_sale', lang)}</span>
          </Link>
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-app-border space-y-1">

          {/* User menu button */}
          {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${userMenuOpen ? 'bg-app-bg' : 'hover:bg-app-bg'}`}
              >
                <div className="w-8 h-8 rounded-full bg-wine-100 text-wine-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-xs font-semibold text-app-text truncate leading-tight">{user.name}</div>
                  <div className="text-[10px] text-app-text3 capitalize leading-tight">{user.role}</div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`flex-shrink-0 text-app-text3 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              </button>

              {/* Dropdown popover */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-xl border border-app-border overflow-hidden z-50">
                  {/* Config */}
                  <Link
                    href="/dashboard/configuracoes"
                    onClick={() => setUserMenuOpen(false)}
                    className={menuItemCls}
                  >
                    <Icon d={ICONS.settings} size={16} />
                    <span>{t('nav_settings', lang)}</span>
                  </Link>

                  <div className="h-px bg-app-border mx-3" />

                  {/* Primeiros passos */}
                  <button
                    onClick={() => { setGsOpen(true); setUserMenuOpen(false) }}
                    className={menuItemCls}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 8 12 12 14 14"/>
                    </svg>
                    <span>{lang === 'pt' ? 'Primeiros passos' : 'Primeros pasos'}</span>
                  </button>

                  {/* Ver tutorial */}
                  <button
                    onClick={() => { openTourRef.current(); setUserMenuOpen(false) }}
                    className={menuItemCls}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    <span>{lang === 'pt' ? 'Ver tutorial' : 'Ver tutorial'}</span>
                  </button>

                  <div className="h-px bg-app-border mx-3" />

                  {/* Logout */}
                  <form action={logout}>
                    <button type="submit" className={menuItemCls}>
                      <Icon d={ICONS.logout} size={16} />
                      <span>{t('nav_logout', lang)}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Lang + Theme at very bottom */}
          <LangToggle current={lang} />
          <ThemeToggle current={theme} />
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
              <span className="text-[9px] font-semibold uppercase tracking-wide">{item.label}</span>
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
