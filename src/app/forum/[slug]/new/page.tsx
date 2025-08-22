'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { showToast } from '@/utils/showToast'

export default function NewThreadPage({ params }: { params: Promise<{ slug: string }> }) {
  // Read slug from server props (Promise) on client route; fallback to empty to build form
  const [slug, setSlug] = React.useState<string>('')
  React.useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const p = await params
        if (alive) setSlug(p?.slug || '')
      } catch {}
    })()
    return () => { alive = false }
  }, [params])
  const router = useRouter()
  const [title, setTitle] = React.useState('')
  const [body, setBody] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) { setError('Titel erforderlich'); return }
    if (!body.trim()) { setError('Inhalt erforderlich'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/forum/sections/${encodeURIComponent(slug)}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Erstellen fehlgeschlagen')
      showToast('Thread erstellt.', 'success', 2000)
      router.push(`/forum/t/${j.id}`)
    } catch (e: any) {
      setError(e?.message || 'Erstellen fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Neuer Thread</h1>
        <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-sm text-gray-700 mb-1">Titel</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Inhalt</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="w-full border border-gray-300 rounded-lg p-2" />
          </div>
          <div>
            <button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60">{saving ? 'Speichere…' : 'Thread erstellen'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

