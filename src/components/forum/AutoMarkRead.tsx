'use client'

import React from 'react'

export default function AutoMarkRead({ threadId, lastPostId }: { threadId: string; lastPostId: string | null }) {
  React.useEffect(() => {
    const controller = new AbortController()
    const mark = async () => {
      try {
        await fetch(`/api/forum/threads/${threadId}/reads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ last_post_id: lastPostId }),
          signal: controller.signal,
        })
      } catch {}
    }
    mark()
    return () => controller.abort()
  }, [threadId, lastPostId])
  return null
}

