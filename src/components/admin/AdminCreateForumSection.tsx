'use client'

import React from 'react'
import { showToast } from '@/utils/showToast'
import { useRouter } from 'next/navigation'

export default function AdminCreateForumSection() {
  const router = useRouter()
  const [slug, setSlug] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [sortOrder, setSortOrder] = React.useState<number>(0)
  const [archived, setArchived] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug.trim() || !title.trim()) {
      showToast('Slug und Titel sind erforderlich', 'error', 1600)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/forum/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug.trim(), title: title.trim(), description: description.trim() || null, sort_order: sortOrder, is_archived: archived }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Erstellen fehlgeschlagen')
      setSlug(''); setTitle(''); setDescription(''); setSortOrder(0); setArchived(false)
      showToast('Bereich erstellt', 'success', 1600)
      router.refresh()
    } catch (e: any) {
      showToast(e?.message || 'Erstellen fehlgeschlagen', 'error', 1600)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="z. B. allgemein" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Titel</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="z. B. Allgemeines" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm text-gray-700 mb-1">Beschreibung</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Sortierung</label>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value || 0))} className="w-full border border-gray-300 rounded-lg p-2 text-sm" />
        </div>
        <div className="flex items-center gap-2 mt-6">
          <input id="archived" type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
          <label htmlFor="archived" className="text-sm text-gray-700">Archiviert</label>
        </div>
      </div>
      <div>
        <button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60">{loading ? 'Speichere…' : 'Bereich erstellen'}</button>
      </div>
      
    </form>
  )
}

