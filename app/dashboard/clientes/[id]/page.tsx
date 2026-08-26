import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getLang } from '@/lib/lang'
import { t } from '@/lib/i18n'
import EditForm from './edit-form'

const typeLabel: Record<string, { pt: string; es: string }> = {
  wine_shop:   { pt: 'Wine Shop',    es: 'Wine Shop' },
  bar:         { pt: 'Bar',          es: 'Bar' },
  restaurant:  { pt: 'Restaurante',  es: 'Restaurante' },
  supermarket: { pt: 'Supermercado', es: 'Supermercado' },
  distributor: { pt: 'Distribuidor', es: 'Distribuidor' },
  prospect:    { pt: 'Prospect',     es: 'Prospecto' },
}

const typeColor: Record<string, string> = {
  wine_shop:   'bg-purple-100 text-purple-700',
  bar:         'bg-orange-100 text-orange-700',
  restaurant:  'bg-blue-100 text-blue-700',
  supermarket: 'bg-emerald-100 text-emerald-700',
  distributor: 'bg-gray-100 text-gray-700',
  prospect:    'bg-gold-100 text-gold-700',
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: client }, { data: orders }, { data: members }, { data: cityRows }, lang] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, city, phone, email, website, contact_name, type, responsible_id, notes, active, created_at, user_profiles!clients_responsible_id_fkey(name)')
      .eq('id', id)
      .single(),
    supabase
      .from('orders')
      .select('id, order_date, status, total_revenue, total_cost, payment_type')
      .eq('client_id', id)
      .order('order_date', { ascending: false }),
    supabase.from('user_profiles').select('id, name').eq('active', true).order('name'),
    supabase.from('clients').select('city').not('city', 'is', null).order('city'),
    getLang(),
  ])
  const existingCities = [...new Set((cityRows ?? []).map((r: { city: string | null }) => r.city).filter(Boolean) as string[])]

  if (!client) notFound()

  const totalRevenue = (orders ?? []).reduce((s, o) => s + (o.total_revenue ?? 0), 0)
  const totalOrders = (orders ?? []).length

  const statusLabel: Record<string, { pt: string; es: string; color: string }> = {
    open:      { pt: 'Aberto',     es: 'Abierto',    color: 'bg-blue-100 text-blue-700' },
    partial:   { pt: 'Parcial',    es: 'Parcial',     color: 'bg-orange-100 text-orange-700' },
    paid:      { pt: 'Pago',       es: 'Pagado',      color: 'bg-emerald-100 text-emerald-700' },
    cancelled: { pt: 'Cancelado',  es: 'Cancelado',   color: 'bg-gray-100 text-gray-600' },
  }

  const clientData = client as typeof client & { user_profiles: { name: string } | null }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/dashboard/clientes" className="inline-flex items-center gap-1.5 text-sm text-app-text3 hover:text-app-text mb-5 transition-colors">
        ← {t('cl_title', lang)}
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-app-border p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-wine-100 text-wine-600 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-app-text">{client.name}</h1>
              {client.type && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColor[client.type] ?? 'bg-gray-100 text-gray-600'}`}>
                  {typeLabel[client.type]?.[lang] ?? client.type}
                </span>
              )}
              {!client.active && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {lang === 'pt' ? 'Arquivado' : 'Archivado'}
                </span>
              )}
            </div>
            <div className="text-sm text-app-text3 mt-0.5">
              {[client.city, clientData.user_profiles?.name && `${lang === 'pt' ? 'Resp:' : 'Resp:'} ${clientData.user_profiles.name}`].filter(Boolean).join(' · ')}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-app-text2">
              {client.phone && <a href={`tel:${client.phone}`} className="hover:text-wine-600">📞 {client.phone}</a>}
              {client.email && <a href={`mailto:${client.email}`} className="hover:text-wine-600">✉️ {client.email}</a>}
              {client.website && (
                <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                  target="_blank" rel="noopener noreferrer" className="hover:text-wine-600">
                  🔗 {client.website}
                </a>
              )}
            </div>
          </div>
        </div>

        {client.notes && (
          <div className="mt-4 pt-4 border-t border-app-border text-sm text-app-text2 leading-relaxed">
            {client.notes}
          </div>
        )}

        {client.contact_name && (
          <div className="mt-3 text-xs text-app-text3">
            {lang === 'pt' ? 'Contato:' : 'Contacto:'} <span className="font-semibold text-app-text2">{client.contact_name}</span>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-app-border">
          <EditForm
            client={{
              id: client.id,
              name: client.name,
              city: client.city,
              phone: client.phone,
              email: client.email,
              website: client.website,
              contact_name: client.contact_name,
              type: client.type,
              responsible_id: client.responsible_id,
              notes: client.notes,
            }}
            members={members ?? []}
            lang={lang}
            existingCities={existingCities}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl border border-app-border p-4">
          <div className="text-xs text-app-text3 mb-1">{lang === 'pt' ? 'Total de pedidos' : 'Total de pedidos'}</div>
          <div className="text-2xl font-bold text-app-text">{totalOrders}</div>
        </div>
        <div className="bg-white rounded-2xl border border-app-border p-4">
          <div className="text-xs text-app-text3 mb-1">{lang === 'pt' ? 'Receita total' : 'Ingresos totales'}</div>
          <div className="text-2xl font-bold text-wine-600 tabular-nums">{fmt(totalRevenue)}</div>
        </div>
      </div>

      {/* Orders history */}
      <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-app-border bg-app-bg/50">
          <h2 className="text-xs font-bold uppercase tracking-wider text-app-text3">
            {lang === 'pt' ? 'Histórico de Pedidos' : 'Historial de Pedidos'}
          </h2>
        </div>
        {(orders ?? []).length === 0 ? (
          <div className="px-5 py-8 text-center text-app-text3 text-sm">
            {lang === 'pt' ? 'Nenhum pedido registrado ainda.' : 'Sin pedidos registrados aún.'}
          </div>
        ) : (
          <div className="divide-y divide-app-border">
            {(orders ?? []).map((o) => {
              const st = statusLabel[o.status] ?? { pt: o.status, es: o.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <div key={o.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-app-text">
                      {new Date(o.order_date + 'T12:00:00').toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'es-CL')}
                    </div>
                    <div className="text-xs text-app-text3">{o.payment_type}</div>
                  </div>
                  <div className="text-sm font-mono font-semibold tabular-nums text-app-text">{fmt(o.total_revenue ?? 0)}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>
                    {st[lang === 'pt' ? 'pt' : 'es']}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
