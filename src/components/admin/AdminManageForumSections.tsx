'use client'

import React from 'react'
import Toast from '@/components/Toast'
import { useRouter } from 'next/navigation'

type Section = {
  slug: string
  title: string
  description: string | null
  sort_order: number
  is_archived: boolean
}

export default function AdminManageForumSections({ initialSections }: { initialSections: Section[] }) {
  const router = useRouter()
  const [rows, setRows] = React.useState(() => initialSections.map(s => ({ ...s })))
  const [loadingSlug, setLoadingSlug] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<string | null>(null)

  const updateField = (idx: number, key: keyof Section, value: any) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r))
  }

  const save = async (idx: number, originalSlug: string) => {
    const s = rows[idx]
    if (!s.slug.trim() || !s.title.trim()) { setToast('Slug und Titel sind erforderlich'); return }
    setLoadingSlug(originalSlug)
    try {
      const res = await fetch(`/api/forum/sections/${encodeURIComponent(originalSlug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: s.slug.trim(), title: s.title.trim(), description: (s.description || '').trim() || null, sort_order: Number(s.sort_order) || 0, is_archived: Boolean(s.is_archived) }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Speichern fehlgeschlagen')
      setToast('Gespeichert')
      router.refresh()
    } catch (e: any) {
      setToast(e?.message || 'Speichern fehlgeschlagen')
    } finally {
      setLoadingSlug(null)
    }
  }

  const del = async (slug: string) => {
    if (!confirm('Diesen Bereich löschen?')) return
    setLoadingSlug(slug)
    try {
      const res = await fetch(`/api/forum/sections/${encodeURIComponent(slug)}`, { method: 'DELETE' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Löschen fehlgeschlagen')
      setToast('Bereich gelöscht')
      router.refresh()
    } catch (e: any) {
      setToast(e?.message || 'Löschen fehlgeschlagen')
    } finally {
      setLoadingSlug(null)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      {rows.length === 0 ? (
        <div className="text-sm text-gray-600">Keine Bereiche vorhanden.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((s, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Slug</label>
                  <input value={s.slug} onChange={(e) => updateField(idx, 'slug', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Titel</label>
                  <input value={s.title} onChange={(e) => updateField(idx, 'title', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Beschreibung</label>
                  <input value={s.description || ''} onChange={(e) => updateField(idx, 'description', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Sortierung</label>
                  <input type="number" value={s.sort_order} onChange={(e) => updateField(idx, 'sort_order', Number(e.target.value || 0))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input id={`arch-${idx}`} type="checkbox" checked={s.is_archived} onChange={(e) => updateField(idx, 'is_archived', e.target.checked)} />
                  <label htmlFor={`arch-${idx}`} className="text-sm text-gray-700">Archiviert</label>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => save(idx, initialSections[idx].slug)} disabled={loadingSlug === initialSections[idx].slug} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-60">Speichern</button>
                <button type="button" onClick={() => del(initialSections[idx].slug)} disabled={loadingSlug === initialSections[idx].slug} className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-60">Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {toast && <Toast message={toast} type="info" onClose={() => setToast(null)} durationMs={1600} />}
    </div>
  )
}

