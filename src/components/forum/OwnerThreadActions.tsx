'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { showToast } from '@/utils/showToast'

export default function OwnerThreadActions({ threadId, initialTitle, initialBody }: { threadId: string; initialTitle: string; initialBody: string | null }) {
  const router = useRouter()
  const [editing, setEditing] = React.useState(false)
  const [title, setTitle] = React.useState(initialTitle)
  const [body, setBody] = React.useState(initialBody || '')
  const [loading, setLoading] = React.useState(false)

  const save = async () => {
    if (loading) return
    if (!title.trim()) { showToast('Titel erforderlich', 'error', 1800); return }
    if (!body.trim()) { showToast('Inhalt erforderlich', 'error', 1800); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/forum/threads/${threadId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), body: body.trim() }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Speichern fehlgeschlagen')
      showToast('Thread gespeichert.', 'success', 2000)
      setEditing(false)
      router.refresh()
    } catch (e: any) {
      showToast(e?.message || 'Speichern fehlgeschlagen', 'error', 2000)
    } finally {
      setLoading(false)
    }
  }

  const softDelete = async () => {
    if (loading) return
    if (!confirm('Diesen Thread ausblenden?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/forum/threads/${threadId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_deleted: true }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Aktion fehlgeschlagen')
      showToast('Thread ausgeblendet', 'success', 2000)
      router.refresh()
    } catch (e: any) {
      showToast(e?.message || 'Aktion fehlgeschlagen', 'error', 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4">
      {!editing ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setEditing(true)} className="text-sm text-gray-600 hover:text-gray-900 underline">Bearbeiten</button>
          <button type="button" onClick={softDelete} className="text-sm text-gray-600 hover:text-gray-900 underline">Ausblenden</button>
        </div>
      ) : (
        <div className="space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="w-full border border-gray-300 rounded p-2 text-sm" />
          <div className="flex items-center gap-2">
            <button type="button" onClick={save} disabled={loading} className="text-xs px-3 py-1.5 rounded-lg border border-orange-600 text-orange-700 hover:bg-orange-50 disabled:opacity-60">Speichern</button>
            <button type="button" onClick={() => { setTitle(initialTitle); setBody(initialBody || ''); setEditing(false) }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-400 text-gray-700 hover:bg-gray-50">Abbrechen</button>
          </div>
        </div>
      )}
      
    </div>
  )
}

