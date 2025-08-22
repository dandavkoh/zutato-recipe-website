'use client'

import React from 'react'
import { showToast } from '@/utils/showToast'

export default function MarkReadButton({ threadId, lastPostId }: { threadId: string; lastPostId: string | null }) {
  const [loading, setLoading] = React.useState(false)
  const mark = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/forum/threads/${threadId}/reads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ last_read_post_id: lastPostId }) })
      if (!res.ok) throw new Error('Aktion fehlgeschlagen')
      showToast('Als gelesen markiert', 'success', 1400)
    } catch (e: any) {
      showToast(e?.message || 'Aktion fehlgeschlagen', 'error', 1400)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="inline-flex items-center relative">
      <button type="button" onClick={mark} disabled={loading} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">Gelesen</button>
      
    </div>
  )
}

