'use client'

import React from 'react'
import Toast from '@/components/Toast'

export default function MarkReadButton({ threadId, lastPostId }: { threadId: string; lastPostId: string | null }) {
  const [loading, setLoading] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)
  const mark = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/forum/threads/${threadId}/reads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ last_read_post_id: lastPostId }) })
      if (!res.ok) throw new Error('Aktion fehlgeschlagen')
      setToast('Als gelesen markiert')
    } catch (e: any) {
      setToast(e?.message || 'Aktion fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="inline-flex items-center relative">
      <button type="button" onClick={mark} disabled={loading} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">Gelesen</button>
      {toast && <Toast message={toast} type="info" onClose={() => setToast(null)} durationMs={1400} />}
    </div>
  )
}

