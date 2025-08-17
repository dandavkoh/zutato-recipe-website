'use client'

import React from 'react'
import Toast from '@/components/Toast'

export default function SendMessageDialog({ recipientId, recipientName }: { recipientId: string; recipientName: string }) {
  const [open, setOpen] = React.useState(false)
  const [subject, setSubject] = React.useState('')
  const [content, setContent] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)

  const send = async () => {
    if (loading) return
    if (!subject.trim()) { setToast('Betreff erforderlich'); return }
    if (!content.trim()) { setToast('Nachricht erforderlich'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/inbox/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: recipientId, subject: subject.trim(), content: content.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Senden fehlgeschlagen')
      setToast('Nachricht gesendet')
      setOpen(false)
      setSubject('')
      setContent('')
    } catch (e: any) {
      setToast(e?.message || 'Senden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)} className="px-3 py-2 rounded-lg border border-orange-600 text-orange-700 hover:bg-orange-50 text-sm">Nachricht senden</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold text-gray-900">Nachricht an {recipientName}</div>
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
      {toast && <Toast message={toast} type="info" onClose={() => setToast(null)} durationMs={1600} />}
    </div>
  )
}

