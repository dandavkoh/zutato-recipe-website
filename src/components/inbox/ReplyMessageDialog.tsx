'use client'

import React from 'react'
import { showToast } from '@/utils/showToast'

export default function ReplyMessageDialog({ recipientId, originalSubject }: { recipientId: string; originalSubject: string }) {
  const [open, setOpen] = React.useState(false)
  const [subject, setSubject] = React.useState(() => originalSubject?.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`)
  const [content, setContent] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const send = async () => {
    if (loading) return
    if (!subject.trim()) { showToast('Betreff erforderlich', 'error', 1600); return }
    if (!content.trim()) { showToast('Nachricht erforderlich', 'error', 1600); return }
    setLoading(true)
    try {
      const res = await fetch('/api/inbox/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: recipientId, subject: subject.trim(), content: content.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Senden fehlgeschlagen')
      showToast('Antwort gesendet', 'success', 1600)
      setOpen(false)
      setContent('')
    } catch (e: any) {
      showToast(e?.message || 'Senden fehlgeschlagen', 'error', 1600)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)} className="text-xs px-3 py-1.5 rounded-lg border border-orange-600 text-orange-700 hover:bg-orange-50">Antworten</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold text-gray-900">Antwort senden</div>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Betreff</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Nachricht</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg border border-gray-400 text-gray-700 hover:bg-gray-50 text-sm">Abbrechen</button>
                <button type="button" onClick={send} disabled={loading} className="px-3 py-2 rounded-lg border border-orange-600 text-orange-700 hover:bg-orange-50 text-sm disabled:opacity-60">Senden</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  )
}