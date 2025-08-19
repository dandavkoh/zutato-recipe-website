'use client'

import React from 'react'
import FontAwesomeIcon from '@/components/FontAwesomeIcon'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

export default function AdminThreadEditActions({ threadId, initialTitle, initialBody }: { threadId: string; initialTitle?: string; initialBody?: string }) {
  const router = useRouter()
  const [editing, setEditing] = React.useState(false)
  const [title, setTitle] = React.useState<string>(initialTitle || '')
  const [body, setBody] = React.useState<string>(initialBody || '')
  const [loading, setLoading] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const save = async () => {
    if (loading) return
    if (!title.trim() && !body.trim()) { setError('Titel oder Inhalt erforderlich'); return }
    setLoading(true)
    setError(null)
    try {
      const payload: any = {}
      if (title.trim()) payload.title = title.trim()
      if (body.trim()) payload.body = body.trim()
      const res = await fetch(`/api/forum/threads/${threadId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Speichern fehlgeschlagen')
      setToast('Gespeichert')
      setEditing(false)
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'Speichern fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const softDelete = async () => {
    if (loading) return
    if (!confirm('Diesen Thread ausblenden?')) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/forum/threads/${threadId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_deleted: true }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Aktion fehlgeschlagen')
      setToast('Thread ausgeblendet')
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'Aktion fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {!editing ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setEditing(true)} className="text-xs px-3 py-1.5 rounded-lg border border-orange-600 text-orange-700 hover:bg-orange-50">
            <span className="inline-flex items-center gap-1">
              <FontAwesomeIcon icon="user-crown" size="sm" style="solid" />
              Bearbeiten
            </span>
          </button>
          <button type="button" onClick={softDelete} disabled={loading} className="text-xs px-3 py-1.5 rounded-lg border border-red-600 text-red-700 hover:bg-red-50 disabled:opacity-60">
            <span className="inline-flex items-center gap-1">
              <FontAwesomeIcon icon="user-crown" size="sm" style="solid" />
              Ausblenden
            </span>
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel (optional)" className="w-full border border-gray-300 rounded p-2 text-sm" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Inhalt (optional)" className="w-full border border-gray-300 rounded p-2 text-sm" />
          {error && <div className="text-xs text-red-600">{error}</div>}
          <div className="flex items-center gap-2">
            <button type="button" onClick={save} disabled={loading} className="text-xs px-3 py-1.5 rounded-lg border border-orange-600 text-orange-700 hover:bg-orange-50 disabled:opacity-60">Speichern</button>
            <button type="button" onClick={() => { setEditing(false); setTitle(initialTitle || ''); setBody(initialBody || '') }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-400 text-gray-700 hover:bg-gray-50">Abbrechen</button>
          </div>
        </div>
      )}
      {toast && <Toast message={toast} type="info" onClose={() => setToast(null)} durationMs={1400} />}
    </div>
  )
}

