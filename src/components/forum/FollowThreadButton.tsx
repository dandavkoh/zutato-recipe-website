'use client'

import React from 'react'
import Toast from '@/components/Toast'

export default function FollowThreadButton({ threadId, initiallyFollowing }: { threadId: string; initiallyFollowing: boolean }) {
  const [following, setFollowing] = React.useState(initiallyFollowing)
  const [loading, setLoading] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)

  const toggle = async () => {
    if (loading) return
    setLoading(true)
    try {
      const method = following ? 'DELETE' : 'POST'
      const res = await fetch(`/api/forum/threads/${threadId}/follow`, { method })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'Aktion fehlgeschlagen')
      }
      setFollowing(!following)
      setToast(following ? 'Nicht mehr folgen' : 'Thread folgen')
    } catch (e: any) {
      setToast(e?.message || 'Aktion fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inline-flex items-center relative">
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={`px-3 py-2 rounded-lg text-sm border ${following ? 'border-gray-400 text-gray-700 hover:bg-gray-50' : 'border-orange-600 text-orange-600 hover:bg-orange-50'} disabled:opacity-50`}
      >
        {following ? 'Gefolgt' : 'Folgen'}
      </button>
      {toast && <Toast message={toast} type="info" onClose={() => setToast(null)} durationMs={1600} />}
    </div>
  )
}

