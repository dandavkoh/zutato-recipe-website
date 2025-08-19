'use client'

import React from 'react'

export default function ReportMessageDialog({ messageId }: { messageId: string }) {
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const [details, setDetails] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const r = reason.trim()
    if (!r) { setError('Bitte einen Grund angeben'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/inbox/messages/${messageId}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: r, details: details.trim() }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Meldung fehlgeschlagen')
      setOpen(false)
      setReason('')
      setDetails('')
    } catch (e: any) {
      setError(e?.message || 'Meldung fehlgeschlagen')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-gray-500 hover:text-orange-700 hover:underline underline-offset-2">Melden</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => !submitting && setOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-lg border p-4">
            <div className="text-lg font-semibold text-gray-900 mb-2">Nachricht melden</div>
            {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Grund</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="z.B. Unangemessener Inhalt, Spam, ..." />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Details (optional)</label>
                <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="Weitere Informationen" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} disabled={submitting} className="text-xs px-3 py-1.5 rounded-lg border border-gray-400 text-gray-700 hover:bg-gray-50 disabled:opacity-60">Abbrechen</button>
                <button type="submit" disabled={submitting} className="text-xs px-3 py-1.5 rounded-lg border border-orange-600 text-orange-700 hover:bg-orange-50 disabled:opacity-60">Senden</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

