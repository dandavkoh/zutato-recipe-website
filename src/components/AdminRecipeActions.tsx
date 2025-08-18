'use client'

import React from 'react'
import Link from 'next/link'

export default function AdminRecipeActions({ recipeId, editHref }: { recipeId: string; editHref: string }) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const softDelete = async () => {
    if (loading) return
    if (!confirm('Dieses Rezept ausblenden?')) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/recipes/${recipeId}`, { method: 'DELETE' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Aktion fehlgeschlagen')
      if (typeof window !== 'undefined') window.location.reload()
    } catch (e: any) {
      setError(e?.message || 'Aktion fehlgeschlagen')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={editHref} className="text-xs px-3 py-1.5 rounded-lg border border-orange-600 text-orange-700 hover:bg-orange-50">Bearbeiten</Link>
      <button type="button" onClick={softDelete} disabled={loading} className="text-xs px-3 py-1.5 rounded-lg border border-red-600 text-red-700 hover:bg-red-50 disabled:opacity-60">Ausblenden</button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

