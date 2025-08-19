'use client'

import React from 'react'
import FontAwesomeIcon from '@/components/FontAwesomeIcon'

export default function AdminCommentActions({ kind, parentId, commentId, onChanged }: { kind: 'recipe' | 'blog'; parentId: string; commentId: string; onChanged?: () => void }) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const softDelete = async () => {
    if (loading) return
    if (!confirm('Diesen Kommentar ausblenden?')) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/${kind === 'recipe' ? 'recipes' : 'blog'}/${parentId}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: commentId })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Aktion fehlgeschlagen')
      if (onChanged) onChanged()
      if (typeof window !== 'undefined') window.location.reload()
    } catch (e: any) {
      setError(e?.message || 'Aktion fehlgeschlagen')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
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

