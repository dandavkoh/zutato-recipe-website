'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

export default function ReplyPage({ params }: { params: Promise<{ id: string }> }) {
  const [threadId, setThreadId] = React.useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = React.useState<boolean>(false)
  React.useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const p = await params
        if (alive) setThreadId(p?.id || '')
      } catch {}
      try {
        const res = await fetch('/api/user/nickname', { method: 'GET' })
        setIsLoggedIn(res.ok)
      } catch {
        setIsLoggedIn(false)
      }
    })()
    return () => { alive = false }
  }, [params])
  const router = useRouter()
  const [content, setContent] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!isLoggedIn) { setError('Bitte zuerst anmelden.'); return }
    if (!content.trim()) { setError('Text erforderlich'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/forum/threads/${encodeURIComponent(threadId)}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Antwort fehlgeschlagen')
      router.push(`/forum/t/${threadId}`)
    } catch (e: any) {
      setError(e?.message || 'Antwort fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Antwort verfassen</h1>
        <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!isLoggedIn && <div className="text-sm text-gray-600">Bitte melde dich an, um zu antworten.</div>}
          <div>
            <label className="block text-sm text-gray-700 mb-1">Text</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} className="w-full border border-gray-300 rounded-lg p-2" />
          </div>
          <div>
            <button type="submit" disabled={saving || !isLoggedIn} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60">{saving ? 'Speichere…' : 'Antwort posten'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

