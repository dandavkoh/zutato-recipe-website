'use client'

import React from 'react'
import { showToast } from '@/utils/showToast'

export default function MessageActions({ messageId, readAt, onChanged }: { messageId: string; readAt: string | null; onChanged?: () => void }) {
  const [loading, setLoading] = React.useState(false)

  const markRead = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/inbox/messages/${messageId}/read`, { method: 'POST' })
      if (!res.ok) throw new Error('Aktion fehlgeschlagen')
      showToast('Als gelesen markiert', 'success', 1400)
      onChanged?.()
    } catch (e: any) {
      showToast(e?.message || 'Aktion fehlgeschlagen', 'error', 1400)
    } finally {
      setLoading(false)
    }
  }

  const del = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/inbox/messages/${messageId}/delete`, { method: 'POST' })
      if (!res.ok) throw new Error('Aktion fehlgeschlagen')
      showToast('Nachricht entfernt', 'success', 1400)
      onChanged?.()
    } catch (e: any) {
      showToast(e?.message || 'Aktion fehlgeschlagen', 'error', 1400)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {!readAt && (
        <button type="button" onClick={markRead} disabled={loading} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">Gelesen</button>
      )}
      <button type="button" onClick={del} disabled={loading} className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50">Entfernen</button>
    </div>
  )
}

