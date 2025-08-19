'use client'

import React from 'react'

type ReportStatus = 'open' | 'in_review' | 'resolved' | 'rejected'

export default function AdminReportActions({ reportId, initialStatus, onChanged }: { reportId: string; initialStatus: ReportStatus; onChanged?: () => void }) {
  const [status, setStatus] = React.useState<ReportStatus>(initialStatus)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const save = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Speichern fehlgeschlagen')
      if (onChanged) onChanged()
    } catch (e: any) {
      setError(e?.message || 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select value={status} onChange={(e) => setStatus(e.target.value as ReportStatus)} className="text-xs border rounded px-2 py-1">
        <option value="open">offen</option>
        <option value="in_review">in Prüfung</option>
        <option value="resolved">gelöst</option>
        <option value="rejected">abgelehnt</option>
      </select>
      <button type="button" onClick={save} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg border border-orange-600 text-orange-700 hover:bg-orange-50 disabled:opacity-60">Speichern</button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

