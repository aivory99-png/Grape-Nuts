'use client'

import { useState } from 'react'
import { inviteTeamMember, updateMemberPermissions, removeMember } from './team-actions'
import type { Lang } from '@/lib/i18n'

type Member = {
  id: string
  name: string
  email: string
  role: string
  permissions: Record<string, Record<string, boolean>> | null
}

const MODULES = [
  { key: 'clientes',      pt: 'Clientes',   es: 'Clientes',    actions: ['ver', 'crear', 'editar'] },
  { key: 'estoque',       pt: 'Estoque',    es: 'Stock',       actions: ['ver', 'crear', 'editar'] },
  { key: 'vendas',        pt: 'Vendas',     es: 'Ventas',      actions: ['ver', 'criar'] },
  { key: 'cobrancas',     pt: 'Cobranças',  es: 'Cobros',      actions: ['ver'] },
  { key: 'configuracoes', pt: 'Config.',    es: 'Config.',     actions: ['ver'] },
]

const ROLES = [
  { value: 'admin',  pt: 'Admin',      es: 'Admin' },
  { value: 'seller', pt: 'Vendedor/a', es: 'Vendedor/a' },
  { value: 'viewer', pt: 'Visualizador', es: 'Visualizador' },
]

const DEFAULT_PERMS = (role: string): Record<string, Record<string, boolean>> => {
  if (role === 'admin') return {
    clientes:      { ver: true, crear: true, editar: true },
    estoque:       { ver: true, crear: true, editar: true },
    vendas:        { ver: true, criar: true },
    cobrancas:     { ver: true },
    configuracoes: { ver: true },
  }
  if (role === 'seller') return {
    clientes:      { ver: true, crear: true, editar: true },
    estoque:       { ver: true, crear: false, editar: false },
    vendas:        { ver: true, criar: true },
    cobrancas:     { ver: true },
    configuracoes: { ver: false },
  }
  return {
    clientes:      { ver: true, crear: false, editar: false },
    estoque:       { ver: true, crear: false, editar: false },
    vendas:        { ver: true, criar: false },
    cobrancas:     { ver: false },
    configuracoes: { ver: false },
  }
}

function PermissionsEditor({
  perms, onChange,
}: {
  perms: Record<string, Record<string, boolean>>
  onChange: (perms: Record<string, Record<string, boolean>>) => void
}) {
  return (
    <div className="space-y-2 mt-3">
      {MODULES.map((mod) => (
        <div key={mod.key} className="flex items-center gap-2">
          <span className="text-xs text-app-text2 w-20 flex-shrink-0">{mod.es}</span>
          <div className="flex gap-1.5 flex-wrap">
            {mod.actions.map((action) => {
              const checked = perms[mod.key]?.[action] ?? false
              return (
                <button
                  key={action}
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...perms,
                      [mod.key]: { ...perms[mod.key], [action]: !checked },
                    }
                    onChange(updated)
                  }}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                    checked
                      ? 'bg-wine-600 text-white border-wine-600'
                      : 'bg-white text-app-text3 border-app-border'
                  }`}
                >
                  {action}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function TeamSection({ members, currentUserId, lang }: {
  members: Member[]
  currentUserId: string
  lang: Lang
}) {
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('seller')
  const [invitePerms, setInvitePerms] = useState(DEFAULT_PERMS('seller'))
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ success?: boolean; error?: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPerms, setEditPerms] = useState<Record<string, Record<string, boolean>>>({})
  const [editRole, setEditRole] = useState('seller')
  const [saving, setSaving] = useState(false)

  const handleRoleChange = (role: string) => {
    setInviteRole(role)
    setInvitePerms(DEFAULT_PERMS(role))
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteName || !inviteEmail) return
    setInviting(true)
    setInviteResult(null)
    const res = await inviteTeamMember({ name: inviteName, email: inviteEmail, role: inviteRole, permissions: invitePerms })
    setInviteResult(res)
    if (res.success) {
      setInviteName(''); setInviteEmail(''); setShowInvite(false)
    }
    setInviting(false)
  }

  async function handleSavePerms(userId: string) {
    setSaving(true)
    await updateMemberPermissions({ userId, role: editRole, permissions: editPerms })
    setEditingId(null)
    setSaving(false)
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return
    await removeMember(userId)
  }

  const inp = 'w-full px-3 py-2.5 rounded-xl border border-app-border bg-white text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-wine-500'

  return (
    <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-app-border">
        <div>
          <h2 className="text-sm font-semibold text-app-text">
            {lang === 'pt' ? 'Equipe' : 'Equipo'}
          </h2>
          <p className="text-xs text-app-text3 mt-0.5">
            {members.length} {lang === 'pt' ? 'pessoa(s)' : 'persona(s)'}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="bg-wine-600 hover:bg-wine-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
        >
          + {lang === 'pt' ? 'Convidar' : 'Invitar'}
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <form onSubmit={handleInvite} className="px-5 py-4 bg-wine-50/40 border-b border-app-border space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-app-text2 mb-1">
                {lang === 'pt' ? 'Nome' : 'Nombre'} *
              </label>
              <input type="text" required className={inp} value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder={lang === 'pt' ? 'Nome completo' : 'Nombre completo'} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-app-text2 mb-1">Email *</label>
              <input type="email" required className={inp} value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)} placeholder="karen@grapesenuts.com.br" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-app-text2 mb-1">
              {lang === 'pt' ? 'Função' : 'Rol'}
            </label>
            <div className="flex gap-2">
              {ROLES.map((r) => (
                <button key={r.value} type="button"
                  onClick={() => handleRoleChange(r.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    inviteRole === r.value
                      ? 'bg-wine-600 text-white border-wine-600'
                      : 'bg-white text-app-text2 border-app-border hover:border-wine-300'
                  }`}>
                  {r[lang === 'pt' ? 'pt' : 'es']}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-app-text2 mb-1">
              {lang === 'pt' ? 'Permissões' : 'Permisos'}
            </label>
            <PermissionsEditor perms={invitePerms} onChange={setInvitePerms} />
          </div>

          {inviteResult?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
              {inviteResult.error}
            </div>
          )}
          {inviteResult?.success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl px-3 py-2">
              {lang === 'pt' ? 'Convite enviado!' : '¡Invitación enviada!'} El email llegará en breve.
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => setShowInvite(false)}
              className="px-4 py-2 rounded-xl border border-app-border text-sm text-app-text2 hover:bg-white transition-colors">
              {lang === 'pt' ? 'Cancelar' : 'Cancelar'}
            </button>
            <button type="submit" disabled={inviting}
              className="flex-1 bg-wine-600 hover:bg-wine-700 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm transition-colors">
              {inviting
                ? (lang === 'pt' ? 'Enviando…' : 'Enviando…')
                : (lang === 'pt' ? 'Enviar convite' : 'Enviar invitación')}
            </button>
          </div>
        </form>
      )}

      {/* Member list */}
      <div className="divide-y divide-app-border">
        {members.length === 0 ? (
          <div className="px-5 py-8 text-center text-app-text3 text-sm">
            {lang === 'pt' ? 'Nenhum membro ainda.' : 'Sin miembros aún.'}
          </div>
        ) : members.map((member) => (
          <div key={member.id} className="px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-wine-50 text-wine-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-app-text">{member.name}</span>
                  {member.id === currentUserId && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-wine-100 text-wine-600">TÚ</span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold-100 text-gold-700 capitalize">
                    {member.role}
                  </span>
                </div>
                <div className="text-xs text-app-text3">{member.email}</div>
              </div>
              {member.id !== currentUserId && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setEditingId(editingId === member.id ? null : member.id)
                      setEditPerms(member.permissions ?? DEFAULT_PERMS(member.role))
                      setEditRole(member.role)
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-xl border border-app-border text-app-text2 hover:bg-app-bg transition-colors"
                  >
                    {lang === 'pt' ? 'Editar' : 'Editar'}
                  </button>
                  <button
                    onClick={() => handleRemove(member.id, member.name)}
                    className="text-xs px-2.5 py-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Inline permission editor */}
            {editingId === member.id && (
              <div className="mt-3 pl-12 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-app-text2 mb-1">
                    {lang === 'pt' ? 'Função' : 'Rol'}
                  </label>
                  <div className="flex gap-2">
                    {ROLES.map((r) => (
                      <button key={r.value} type="button"
                        onClick={() => { setEditRole(r.value); setEditPerms(DEFAULT_PERMS(r.value)) }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                          editRole === r.value
                            ? 'bg-wine-600 text-white border-wine-600'
                            : 'bg-white text-app-text2 border-app-border'
                        }`}>
                        {r[lang === 'pt' ? 'pt' : 'es']}
                      </button>
                    ))}
                  </div>
                </div>
                <PermissionsEditor perms={editPerms} onChange={setEditPerms} />
                <div className="flex gap-2">
                  <button onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 rounded-xl border border-app-border text-xs text-app-text2 hover:bg-app-bg">
                    {lang === 'pt' ? 'Cancelar' : 'Cancelar'}
                  </button>
                  <button onClick={() => handleSavePerms(member.id)} disabled={saving}
                    className="px-4 py-1.5 rounded-xl bg-wine-600 text-white text-xs font-semibold disabled:opacity-50 hover:bg-wine-700">
                    {saving ? '…' : (lang === 'pt' ? 'Salvar' : 'Guardar')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
