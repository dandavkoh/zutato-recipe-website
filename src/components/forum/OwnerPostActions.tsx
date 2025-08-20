'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

export default function OwnerPostActions({ postId, initialContent, renderInline = false }: { postId: string; initialContent: string; renderInline?: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = React.useState(false)
  const [content, setContent] = React.useState(initialContent)
  const [loading, setLoading] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)

  const save = async () => {
    if (loading) return
    if (!content.trim()) { setToast('Text erforderlich'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: content.trim() }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Speichern fehlgeschlagen')
      setToast('Gespeichert')
      setEditing(false)
      router.refresh()
    } catch (e: any) {
      setToast(e?.message || 'Speichern fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const softDelete = async () => {
    if (loading) return
    if (!confirm('Diesen Beitrag ausblenden?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_deleted: true }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Aktion fehlgeschlagen')
      setToast('Beitrag ausgeblendet')
      router.refresh()
    } catch (e: any) {
      setToast(e?.message || 'Aktion fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  if (renderInline) {
    return (
      <div className="mt-2">
        {!editing ? (
          <div>
            <div className="text-gray-900 whitespace-pre-wrap">{initialContent}</div>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={() => setEditing(true)} className="text-sm text-gray-600 hover:text-gray-900 underline">Bearbeiten</button>
              <button type="button" onClick={softDelete} className="text-sm text-gray-600 hover:text-gray-900 underline">Ausblenden</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="w-full border border-gray-300 rounded p-2 text-sm" />
            <div className="flex items-center gap-2">
              <button type="button" onClick={save} disabled={loading} className="text-xs px-3 py-1.5 rounded-lg border border-orange-600 text-orange-700 hover:bg-orange-50 disabled:opacity-60">Speichern</button>
              <button type="button" onClick={() => { setContent(initialContent); setEditing(false) }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-400 text-gray-700 hover:bg-gray-50">Abbrechen</button>
            </div>
          </div>
        )}
        {toast && <Toast message={toast} type="info" onClose={() => setToast(null)} durationMs={1400} />}
      </div>
    )
  }

  return (
    <div className="mt-2">
      {!editing ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setEditing(true)} className="text-sm text-gray-600 hover:text-gray-900 underline">Bearbeiten</button>
          <button type="button" onClick={softDelete} className="text-sm text-gray-600 hover:text-gray-900 underline">Ausblenden</button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="w-full border border-gray-300 rounded p-2 text-sm" />
          <div className="flex items-center gap-2">
            <button type="button" onClick={save} disabled={loading} className="text-xs px-3 py-1.5 rounded-lg border border-orange-600 text-orange-700 hover:bg-orange-50 disabled:opacity-60">Speichern</button>
            <button type="button" onClick={() => { setContent(initialContent); setEditing(false) }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-400 text-gray-700 hover:bg-gray-50">Abbrechen</button>
          </div>
        </div>
      )}
      {toast && <Toast message={toast} type="info" onClose={() => setToast(null)} durationMs={1400} />}
    </div>
  )
}

