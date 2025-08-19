'use client'

import React from 'react'

export default function AdminReportNotesInput({ reportId, initialNotes }: { reportId: string; initialNotes: string }) {
  const [notes, setNotes] = React.useState<string>(initialNotes || '')
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
        body: JSON.stringify({ resolution_notes: notes.trim() || null })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Speichern fehlgeschlagen')
    } catch (e: any) {
      setError(e?.message || 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void save()
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={save}
        onKeyDown={onKeyDown}
        placeholder="Notizen hinzufügen"
        className="text-xs border rounded px-2 py-1 w-full"
      />
      {saving && <span className="text-[10px] text-gray-400">Speichern…</span>}
      {error && <span className="text-[10px] text-red-600">{error}</span>}
    </div>
  )
}

