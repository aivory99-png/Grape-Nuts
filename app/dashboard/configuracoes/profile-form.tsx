'use client'

import { useState, useTransition } from 'react'
import { updateProfile, updateSeller, deleteSeller } from './actions'
import { setLangAction } from '@/app/actions/lang'
import { createSeller } from '@/app/dashboard/clientes/novo/actions'
import type { Lang } from '@/lib/i18n'

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function Row({
  label,
  sub,
  value,
  onEdit,
  editing,
  children,
}: {
  label: string
  sub?: string
  value?: string
  onEdit?: () => void
  editing?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="py-4 border-b border-app-border last:border-0">
      {!editing ? (
        <div className="flex items-start gap-4">
          <div className="w-36 flex-shrink-0">
            <div className="text-sm font-semibold text-app-text">{label}</div>
            {sub && <div className="text-xs text-app-text3 mt-0.5">{sub}</div>}
          </div>
          <div className="flex-1 text-sm text-app-text2">{value || '—'}</div>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1 text-xs text-wine-600 hover:text-wine-700 font-medium transition-colors flex-shrink-0"
            >
              <EditIcon />
              Editar
            </button>
          )}
        </div>
      ) : (
        <div>
          <div className="text-sm font-semibold text-app-text mb-2">{label}</div>
          {children}
        </div>
      )}
    </div>
  )
}

type Seller = { id: string; name: string; phone?: string | null; notes?: string | null }

export default function ProfileForm({
  name,
  email,
  sellers,
  lang,
}: {
  name: string
  email: string
  sellers: Seller[]
  lang: Lang
}) {
  const [editingField, setEditingField] = useState<'name' | null>(null)
  const [nameVal,      setNameVal]      = useState(name)
  const [saving,       setSaving]       = useState(false)
  const [err,          setErr]          = useState('')
  const [, startLang]                   = useTransition()

  const [localSellers,  setLocalSellers]  = useState(sellers)
  const [deletingId,    setDeletingId]    = useState<string | null>(null)

  // edit state per seller
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [editName,     setEditName]     = useState('')
  const [editPhone,    setEditPhone]    = useState('')
  const [editNotes,    setEditNotes]    = useState('')
  const [editSaving,   setEditSaving]   = useState(false)
  const [editError,    setEditError]    = useState('')

  // add form
  const [showAdd,      setShowAdd]      = useState(false)
  const [newName,      setNewName]      = useState('')
  const [newPhone,     setNewPhone]     = useState('')
  const [newNotes,     setNewNotes]     = useState('')
  const [addingSeller, setAddingSeller] = useState(false)
  const [addError,     setAddError]     = useState('')

  const L = lang
  const inp = 'w-full px-3 py-2.5 rounded-xl border border-app-border bg-white text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-wine-500'

  async function saveName() {
    if (!nameVal.trim()) return
    setSaving(true); setErr('')
    const res = await updateProfile({ name: nameVal })
    setSaving(false)
    if (res.error) setErr(res.error)
    else setEditingField(null)
  }

  function toggleLang() {
    const next: Lang = lang === 'pt' ? 'es' : 'pt'
    startLang(async () => { await setLangAction(next) })
  }

  function openEdit(s: Seller) {
    setEditingId(s.id)
    setEditName(s.name)
    setEditPhone(s.phone ?? '')
    setEditNotes(s.notes ?? '')
    setEditError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditPhone('')
    setEditNotes('')
    setEditError('')
  }

  async function handleUpdateSeller(id: string) {
    if (!editName.trim()) return
    setEditSaving(true); setEditError('')
    const res = await updateSeller(id, editName.trim(), { phone: editPhone.trim(), notes: editNotes.trim() })
    if (res.error) {
      setEditError(res.error)
    } else {
      setLocalSellers(prev => prev.map(s =>
        s.id === id ? { ...s, name: editName.trim(), phone: editPhone.trim() || null, notes: editNotes.trim() || null } : s
      ))
      setEditingId(null)
    }
    setEditSaving(false)
  }

  async function handleDeleteSeller(id: string) {
    setDeletingId(id)
    const res = await deleteSeller(id)
    if (!res.error) setLocalSellers(prev => prev.filter(s => s.id !== id))
    setDeletingId(null)
  }

  async function handleAddSeller() {
    if (!newName.trim()) return
    setAddingSeller(true); setAddError('')
    const res = await createSeller(newName.trim(), { phone: newPhone.trim(), notes: newNotes.trim() })
    if (res.id) {
      setLocalSellers(prev => [...prev, {
        id: res.id!,
        name: newName.trim(),
        phone: newPhone.trim() || null,
        notes: newNotes.trim() || null,
      }])
      setNewName(''); setNewPhone(''); setNewNotes('')
      setShowAdd(false)
    } else {
      setAddError(res.error ?? (L === 'pt' ? 'Erro ao criar vendedor.' : 'Error al crear vendedor.'))
    }
    setAddingSeller(false)
  }

  return (
    <div data-tour="profile-section" className="bg-white rounded-2xl border border-app-border overflow-hidden">
      {/* Avatar header */}
      <div className="px-6 pt-6 pb-5 border-b border-app-border">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-wine-900 flex items-center justify-center flex-shrink-0">
            <span className="text-3xl font-bold text-wine-200 select-none">
              {nameVal.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <h2 className="text-base font-bold text-app-text mb-0.5">Perfil</h2>
            <p className="text-xs text-app-text3">
              {L === 'pt' ? 'Como você aparece na plataforma.' : 'Cómo apareces en la plataforma.'}
            </p>
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="px-6">
        {/* Display name */}
        <Row
          label={L === 'pt' ? 'Nome' : 'Nombre'}
          sub={L === 'pt' ? 'Como te identificas' : 'Cómo te identificas'}
          value={nameVal}
          onEdit={() => { setEditingField('name'); setErr('') }}
          editing={editingField === 'name'}
        >
          <input
            type="text" autoFocus className={inp}
            value={nameVal} onChange={e => setNameVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveName()}
          />
          {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => { setEditingField(null); setNameVal(name) }}
              className="px-3 py-1.5 rounded-lg border border-app-border text-xs text-app-text2 hover:bg-app-bg transition-colors">
              {L === 'pt' ? 'Cancelar' : 'Cancelar'}
            </button>
            <button type="button" onClick={saveName} disabled={saving || !nameVal.trim()}
              className="px-4 py-1.5 rounded-lg bg-wine-600 hover:bg-wine-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors">
              {saving ? '…' : (L === 'pt' ? 'Salvar' : 'Guardar')}
            </button>
          </div>
        </Row>

        {/* Email */}
        <Row
          label="Email"
          sub={L === 'pt' ? 'Usado para entrar' : 'Usado para iniciar sesión'}
          value={email}
        />

        {/* Language */}
        <Row
          label={L === 'pt' ? 'Idioma' : 'Idioma'}
          sub={L === 'pt' ? 'Idioma da interface' : 'Idioma de la interfaz'}
          value={lang === 'pt' ? 'Português (PT-BR)' : 'Español (ES)'}
          onEdit={toggleLang}
        />

        {/* Sellers */}
        <div className="py-4">
          <div className="flex items-start gap-4">
            <div className="w-36 flex-shrink-0">
              <div className="text-sm font-semibold text-app-text">
                {L === 'pt' ? 'Vendedores/as' : 'Vendedores/as'}
              </div>
              <div className="text-xs text-app-text3 mt-0.5">
                {L === 'pt' ? 'Equipe de vendas' : 'Equipo de ventas'}
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              {localSellers.length === 0 && !showAdd && (
                <p className="text-sm text-app-text3 italic">
                  {L === 'pt' ? 'Nenhum vendedor ainda' : 'Sin vendedores aún'}
                </p>
              )}

              {/* Seller rows */}
              {localSellers.map(s => (
                <div key={s.id}>
                  {editingId === s.id ? (
                    /* Edit form */
                    <div className="p-3 bg-app-bg rounded-xl border border-wine-200 space-y-2">
                      <div className="text-xs font-semibold text-app-text2 mb-1">
                        {L === 'pt' ? 'Editar vendedor' : 'Editar vendedor'}
                      </div>
                      <input
                        type="text" autoFocus className={inp}
                        value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') cancelEdit() }}
                        placeholder={L === 'pt' ? 'Nome *' : 'Nombre *'}
                      />
                      <input
                        type="tel" className={inp}
                        value={editPhone} onChange={e => setEditPhone(e.target.value)}
                        placeholder={L === 'pt' ? 'Telefone (opcional)' : 'Teléfono (opcional)'}
                      />
                      <textarea
                        className={inp + ' resize-none'}
                        rows={2}
                        value={editNotes} onChange={e => setEditNotes(e.target.value)}
                        placeholder={L === 'pt' ? 'Notas (opcional)' : 'Notas (opcional)'}
                      />
                      {editError && <p className="text-xs text-red-500">{editError}</p>}
                      <div className="flex gap-2">
                        <button type="button" onClick={cancelEdit}
                          className="px-3 py-1.5 rounded-xl border border-app-border text-xs text-app-text2 hover:bg-white transition-colors">
                          {L === 'pt' ? 'Cancelar' : 'Cancelar'}
                        </button>
                        <button type="button" onClick={() => handleUpdateSeller(s.id)}
                          disabled={editSaving || !editName.trim()}
                          className="flex-1 bg-wine-600 hover:bg-wine-700 disabled:opacity-50 text-white text-xs font-semibold py-1.5 rounded-xl transition-colors">
                          {editSaving ? '…' : (L === 'pt' ? 'Salvar' : 'Guardar')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Chip row */
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-app-border bg-app-bg">
                      <div className="w-6 h-6 rounded-full bg-wine-100 flex items-center justify-center text-[10px] font-bold text-wine-700 flex-shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-app-text font-medium truncate">{s.name}</div>
                        {s.phone && <div className="text-xs text-app-text3 truncate">{s.phone}</div>}
                      </div>
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="text-xs text-app-text3 hover:text-wine-600 transition-colors px-1.5 py-0.5"
                        title={L === 'pt' ? 'Editar' : 'Editar'}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSeller(s.id)}
                        disabled={deletingId === s.id}
                        className="text-xs text-app-text3 hover:text-red-500 disabled:opacity-40 transition-colors px-1 leading-none"
                        title={L === 'pt' ? 'Remover' : 'Eliminar'}
                      >
                        {deletingId === s.id ? '…' : '✕'}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add form */}
              {showAdd ? (
                <div className="p-3 bg-app-bg rounded-xl border border-app-border space-y-2">
                  <div className="text-xs font-semibold text-app-text2">
                    {L === 'pt' ? 'Novo vendedor' : 'Nuevo vendedor'}
                  </div>
                  <input type="text" className={inp}
                    placeholder={L === 'pt' ? 'Nome *' : 'Nombre *'}
                    value={newName} onChange={e => setNewName(e.target.value)}
                    autoFocus
                  />
                  <input type="tel" className={inp}
                    placeholder={L === 'pt' ? 'Telefone (opcional)' : 'Teléfono (opcional)'}
                    value={newPhone} onChange={e => setNewPhone(e.target.value)}
                  />
                  <textarea
                    className={inp + ' resize-none'}
                    rows={2}
                    placeholder={L === 'pt' ? 'Notas (opcional)' : 'Notas (opcional)'}
                    value={newNotes} onChange={e => setNewNotes(e.target.value)}
                  />
                  {addError && <p className="text-xs text-red-500">{addError}</p>}
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => { setShowAdd(false); setNewName(''); setNewPhone(''); setNewNotes(''); setAddError('') }}
                      className="px-3 py-1.5 rounded-xl border border-app-border text-xs text-app-text2 hover:bg-white transition-colors">
                      {L === 'pt' ? 'Cancelar' : 'Cancelar'}
                    </button>
                    <button type="button" onClick={handleAddSeller}
                      disabled={addingSeller || !newName.trim()}
                      className="flex-1 bg-wine-600 hover:bg-wine-700 disabled:opacity-50 text-white text-xs font-semibold py-1.5 rounded-xl transition-colors">
                      {addingSeller ? '…' : (L === 'pt' ? 'Criar vendedor' : 'Crear vendedor')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setShowAdd(true); setAddError('') }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-wine-600 hover:text-wine-700 transition-colors"
                >
                  <span className="text-base leading-none">+</span>
                  {L === 'pt' ? 'Criar vendedor' : 'Crear vendedor'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
