'use client'

import React from 'react'
import FontAwesomeIcon from '@/components/FontAwesomeIcon'
import { useRouter } from 'next/navigation'
import { showToast } from '@/utils/showToast'

export default function AdminThreadActions({ threadId, isClosed, isArchived }: { threadId: string; isClosed: boolean; isArchived: boolean }) {
  const router = useRouter()
  const [closed, setClosed] = React.useState(isClosed)
  const [archived, setArchived] = React.useState(isArchived)
  const [loading, setLoading] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)

  const toggle = async (field: 'is_closed' | 'is_archived') => {
    if (loading) return
    setLoading(true)
    try {
      const payload: any = {}
      if (field === 'is_closed') payload.is_closed = !closed
      if (field === 'is_archived') payload.is_archived = !archived
      const res = await fetch(`/api/forum/threads/${threadId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Aktion fehlgeschlagen')
      if (field === 'is_closed') setClosed(!closed)
      if (field === 'is_archived') setArchived(!archived)
      showToast('Gespeichert', 'success', 1400)
      router.refresh()
    } catch (e: any) {
      showToast(e?.message || 'Aktion fehlgeschlagen', 'error', 1600)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => toggle('is_closed')} disabled={loading} className={`text-xs px-3 py-1.5 rounded-lg border ${closed ? 'border-orange-600 text-orange-700 bg-orange-50' : 'border-orange-600 text-orange-700 hover:bg-orange-50'} disabled:opacity-60`}>
        <span className="inline-flex items-center gap-1">
          <FontAwesomeIcon icon="user-crown" size="sm" style="solid" />
          {closed ? 'Öffnen' : 'Schließen'}
        </span>
      </button>
      <button type="button" onClick={() => toggle('is_archived')} disabled={loading} className={`text-xs px-3 py-1.5 rounded-lg border ${archived ? 'border-orange-600 text-orange-700 bg-orange-50' : 'border-orange-600 text-orange-700 hover:bg-orange-50'} disabled:opacity-60`}>
        <span className="inline-flex items-center gap-1">
          <FontAwesomeIcon icon="user-crown" size="sm" style="solid" />
          {archived ? 'Entarchivieren' : 'Archivieren'}
        </span>
      </button>
      
    </div>
  )
}

