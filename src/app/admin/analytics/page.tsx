import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

type Search = Promise<{
  from?: string
  to?: string
  event?: string
  type?: string
  top?: string
}>

type Row = {
  occurred_at: string
  event_name: string
  content_type: string | null
}

export const metadata = { title: 'Analytics' }

function startOfDayIso(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.toISOString()
}

function endOfDayIso(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x.toISOString()
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams?: Search }) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) redirect('/login')

  let isAdmin = false
  try {
    const { data: rpcVal } = await supabase.rpc('current_user_is_admin')
    isAdmin = Boolean(rpcVal)
  } catch {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('is_admin')
      .eq('user_id', auth.user.id)
      .maybeSingle()
    isAdmin = Boolean((settings as any)?.is_admin)
  }
  if (!isAdmin) redirect('/')

  const q = searchParams ? await searchParams : {}
  const today = new Date()
  const defaultFrom = startOfDayIso(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000))
  const defaultTo = endOfDayIso(today)
  const fromIso = q.from && !Array.isArray(q.from) ? startOfDayIso(new Date(q.from)) : defaultFrom
  const toIso = q.to && !Array.isArray(q.to) ? endOfDayIso(new Date(q.to)) : defaultTo
  const eventFilter = q.event && !Array.isArray(q.event) ? q.event : ''
  const typeFilter = q.type && !Array.isArray(q.type) ? q.type : ''
  const topN = (() => {
    const raw = q.top && !Array.isArray(q.top) ? parseInt(q.top) : 10
    if (!Number.isFinite(raw)) return 10
    return Math.min(100, Math.max(1, raw))
  })()

  let base = supabase
    .from('analytics_events')
    .select('occurred_at, event_name, content_type')
    .gte('occurred_at', fromIso)
    .lte('occurred_at', toIso)
    .order('occurred_at', { ascending: true })

  if (eventFilter) base = base.eq('event_name', eventFilter)
  if (typeFilter) base = base.eq('content_type', typeFilter)

  const { data } = await base.limit(10000)
  const rows: Row[] = (data as Row[] | null) || []

  // Aggregate by day and by event
  const byDayEvent = new Map<string, Map<string, number>>()
  const byEventTotal = new Map<string, number>()
  const byTypeTotal = new Map<string, number>()
  const recipeViewCount = new Map<string, number>()

  for (const r of rows) {
    const d = new Date(r.occurred_at)
    const dayKey = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
    const eventName = r.event_name
    const contentType = r.content_type || 'unknown'
    if (!byDayEvent.has(dayKey)) byDayEvent.set(dayKey, new Map())
    const m = byDayEvent.get(dayKey)!
    m.set(eventName, (m.get(eventName) || 0) + 1)
    byEventTotal.set(eventName, (byEventTotal.get(eventName) || 0) + 1)
    byTypeTotal.set(contentType, (byTypeTotal.get(contentType) || 0) + 1)
    // recipeViewCount computed via dedicated query below
  }

  const days = Array.from(byDayEvent.keys()).sort()
  const eventNames = Array.from(byEventTotal.keys()).sort()
  const typeNames = Array.from(byTypeTotal.keys()).sort()
  // Resolve Top Recipes by separate query (ensures content_id available)
  {
    const { data: recipeEvents } = await supabase
      .from('analytics_events')
      .select('content_id')
      .eq('event_name', 'recipe_view')
      .gte('occurred_at', fromIso)
      .lte('occurred_at', toIso)
      .not('content_id', 'is', null)
      .limit(20000)
    const list = (recipeEvents as Array<{ content_id: string | null }> | null) || []
    for (const row of list) {
      const id = row.content_id as string
      if (id) recipeViewCount.set(id, (recipeViewCount.get(id) || 0) + 1)
    }
  }
  const topRecipeIdsSorted = Array.from(recipeViewCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, topN).map(([id]) => id)
  let recipeNameById: Record<string, { name: string; image_url: string | null }> = {}
  if (topRecipeIdsSorted.length > 0) {
    const { data: recs } = await supabase
      .from('recipes')
      .select('id, name, image_url')
      .in('id', topRecipeIdsSorted)
    const list = (recs as Array<{ id: string; name: string; image_url: string | null }> | null) || []
    recipeNameById = Object.fromEntries(list.map((r) => [r.id, { name: r.name, image_url: r.image_url }]))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Seitenaufrufe und Interaktionen</p>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3" method="get">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Von</label>
              <input type="date" name="from" defaultValue={fromIso.slice(0,10)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Bis</label>
              <input type="date" name="to" defaultValue={toIso.slice(0,10)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Event</label>
              <input type="text" name="event" placeholder="z.B. page_view" defaultValue={eventFilter} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Content-Typ</label>
              <input type="text" name="type" placeholder="z.B. recipe" defaultValue={typeFilter} className="w-full border rounded px-3 py-2" />
            </div>
            <div className="self-end">
              <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded">Filtern</button>
            </div>
          </form>

          {/* Totals by event */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-gray-700 mb-3">Events gesamt (Zeitraum)</div>
              {eventNames.length === 0 ? (
                <div className="text-gray-600 text-sm">Keine Daten</div>
              ) : (
                <div className="space-y-2">
                  {eventNames.map((e) => {
                    const total = byEventTotal.get(e) || 0
                    return (
                      <div key={e} className="grid grid-cols-[160px_1fr_auto] items-center gap-3">
                        <div className="text-sm text-gray-800 truncate">{e}</div>
                        <div className="h-3 bg-gray-100 rounded">
                          <div className="h-3 bg-orange-500 rounded" style={{ width: `${Math.min(100, (total / Math.max(1, Math.max(...Array.from(byEventTotal.values())))) * 100)}%` }} />
                        </div>
                        <div className="text-xs text-gray-600 tabular-nums">{total}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Totals by content type */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-gray-700 mb-3">Views/Events nach Content-Typ</div>
              {typeNames.length === 0 ? (
                <div className="text-gray-600 text-sm">Keine Daten</div>
              ) : (
                <div className="space-y-2">
                  {typeNames.map((t) => {
                    const total = byTypeTotal.get(t) || 0
                    return (
                      <div key={t} className="grid grid-cols-[160px_1fr_auto] items-center gap-3">
                        <div className="text-sm text-gray-800 truncate">{t}</div>
                        <div className="h-3 bg-gray-100 rounded">
                          <div className="h-3 bg-orange-500 rounded" style={{ width: `${Math.min(100, (total / Math.max(1, Math.max(...Array.from(byTypeTotal.values())))) * 100)}%` }} />
                        </div>
                        <div className="text-xs text-gray-600 tabular-nums">{total}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Time series by day (stacked per event) */}
          <div className="mt-8 bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">Zeitverlauf (pro Tag, nach Event)</div>
            {/* Legend */}
            {eventNames.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-700">
                {eventNames.map((e) => (
                  <div key={e} className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: ((): string => {
                      switch (e) {
                        case 'page_view': return '#93c5fd' // blue-300
                        case 'blog_view': return '#60a5fa' // blue-400
                        case 'blog_post_view': return '#f59e0b' // amber-500
                        case 'recipe_view': return '#f97316' // orange-500
                        case 'forum_view': return '#34d399' // emerald-400
                        case 'forum_section_view': return '#10b981' // emerald-500
                        case 'forum_thread_view': return '#059669' // emerald-600
                        default: return '#fed7aa' // orange-200
                      }
                    })() }} />
                    <span className="truncate max-w-[160px]">{e}</span>
                  </div>
                ))}
              </div>
            )}
            {days.length === 0 ? (
              <div className="text-gray-600 text-sm">Keine Daten</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-[120px_1fr] gap-3">
                    {days.map((day) => {
                      const m = byDayEvent.get(day) || new Map()
                      const total = Array.from(m.values()).reduce((a, b) => a + b, 0)
                      return (
                        <div key={day} className="contents">
                          <div className="text-xs text-gray-600 tabular-nums">{day}</div>
                          <div className="h-4 bg-gray-100 rounded flex overflow-hidden">
                            {eventNames.map((e) => {
                              const val = m.get(e) || 0
                              const frac = total > 0 ? (val / total) : 0
                              const color = ((): string => {
                                switch (e) {
                                  case 'page_view': return '#93c5fd' // blue-300
                                  case 'blog_view': return '#60a5fa' // blue-400
                                  case 'blog_post_view': return '#f59e0b' // amber-500
                                  case 'recipe_view': return '#f97316' // orange-500
                                  case 'forum_view': return '#34d399' // emerald-400
                                  case 'forum_section_view': return '#10b981' // emerald-500
                                  case 'forum_thread_view': return '#059669' // emerald-600
                                  default: return '#fed7aa' // orange-200
                                }
                              })()
                              return (
                                <div key={e} className="h-4" title={`${e}: ${val}`} style={{ width: `${frac * 100}%`, backgroundColor: color }} />
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Top Recipes in range */}
          <div className="mt-8 bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-700">Top {topN} Rezepte (Zeitraum)</div>
              <form method="get" className="flex items-center gap-2">
                <input type="hidden" name="from" value={fromIso.slice(0,10)} />
                <input type="hidden" name="to" value={toIso.slice(0,10)} />
                {eventFilter && <input type="hidden" name="event" value={eventFilter} />}
                {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
                <label className="text-xs text-gray-600">Top</label>
                <input type="number" name="top" min={1} max={100} defaultValue={topN} className="w-20 border rounded px-2 py-1 text-sm" />
                <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm">Anwenden</button>
              </form>
            </div>
            {topRecipeIdsSorted.length === 0 ? (
              <div className="text-gray-600 text-sm">Keine Rezept-Views im Zeitraum.</div>
            ) : (
              <div className="space-y-3">
                {topRecipeIdsSorted.map((id) => {
                  const total = recipeViewCount.get(id) || 0
                  const r = recipeNameById[id]
                  const name = r?.name || 'Unbekanntes Rezept'
                  return (
                    <div key={id} className="grid grid-cols-[56px_1fr_auto] items-center gap-3">
                      <div className="h-10 w-14 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                        {r?.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.image_url} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-lg">🍽️</span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm text-gray-900 truncate">{name}</div>
                        <div className="h-2 bg-gray-100 rounded mt-1">
                          <div className="h-2 bg-orange-500 rounded" style={{ width: `${Math.min(100, (total / Math.max(1, Math.max(...Array.from(recipeViewCount.values())))) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 tabular-nums">{total}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}


