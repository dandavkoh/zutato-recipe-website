'use client'

import React from 'react'
import { showToast } from '@/utils/showToast'
import { useRouter } from 'next/navigation'
import FontAwesomeIcon from '@/components/FontAwesomeIcon'

export default function AdminPostActions({ postId, initialContent }: { postId: string; initialContent: string }) {
  const [editing, setEditing] = React.useState(false)
  const [content, setContent] = React.useState(initialContent)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<string | null>(null)
  const router = useRouter()

  const save = async () => {
    if (loading) return
    if (!content.trim()) { setError('Text erforderlich'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: content.trim() }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Speichern fehlgeschlagen')
      showToast('Beitrag gespeichert.', 'success', 2000)
      setEditing(false)
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'Speichern fehlgeschlagen')
      showToast(e?.message || 'Speichern fehlgeschlagen', 'error', 2000)
    } finally {
      setLoading(false)
    }
  }

  const softDelete = async () => {
    if (loading) return
    if (!confirm('Diesen Beitrag ausblenden?')) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_deleted: true }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Aktion fehlgeschlagen')
      showToast('Beitrag ausgeblendet', 'success', 2000)
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'Aktion fehlgeschlagen')
      showToast(e?.message || 'Aktion fehlgeschlagen', 'error', 2000)
    } finally {
      setLoading(false)
    }
  }

  if (!editing) {
    return (
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
    )
  }

  return (
    <div className="mt-2">
      <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="w-full border border-gray-300 rounded p-2 text-sm" />
      <div className="flex items-center gap-2 mt-2">
        <button type="button" onClick={save} disabled={loading || !content.trim()} className="text-xs px-3 py-1.5 rounded-lg border border-orange-600 text-orange-700 hover:bg-orange-50 disabled:opacity-60">Speichern</button>
        <button type="button" onClick={() => { setEditing(false); setContent(initialContent) }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-400 text-gray-700 hover:bg-gray-50">Abbrechen</button>
      </div>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  )
}

