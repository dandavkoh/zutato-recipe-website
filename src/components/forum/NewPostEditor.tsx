'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { showToast } from '@/utils/showToast'

export default function NewPostEditor({ threadId, disabled }: { threadId: string; disabled?: boolean }) {
  const [content, setContent] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (disabled) return
    const text = content.trim()
    if (!text) { setError('Text erforderlich'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/forum/threads/${encodeURIComponent(threadId)}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Antwort fehlgeschlagen')
      setContent('')
      showToast('Beitrag veröffentlicht.', 'success', 2000)
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'Antwort fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-sm font-medium text-gray-900 mb-2">Antwort verfassen</div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={disabled || saving}
        rows={5}
        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
        placeholder={disabled ? 'Thread geschlossen/archiviert' : 'Deine Antwort...'}
      />
      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button type="submit" disabled={disabled || saving || !content.trim()} className="px-4 py-2 text-sm rounded-lg border border-orange-600 text-orange-700 hover:bg-orange-50 disabled:opacity-60">
          {saving ? 'Senden…' : 'Senden'}
        </button>
      </div>
    </form>
  )
}

