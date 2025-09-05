'use client'

import React from 'react'
import FontAwesomeIcon from '@/components/FontAwesomeIcon'
import { showToast } from '@/utils/showToast'
import { AnalyticsEvents, trackEvent } from '@/utils/analytics'


type Props = {
  title: string
  text?: string
  url?: string
  className?: string
  label?: string
  context?: { kind: 'recipe'; recipeId: string } | { kind: 'blog'; postId: string }
}

export default function ShareButton({ title, text, url, className = '', label = 'Teilen', context }: Props) {
  const doShare = async () => {
    try {
      const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '')
      const shareData: ShareData = {
        title,
        text: text || title,
        url: shareUrl,
      }
      // Track CTA click before attempting share
      if (context?.kind === 'recipe') {
        trackEvent(AnalyticsEvents.ClickShareRecipe, { recipe_id: context.recipeId })
      } else if (context?.kind === 'blog') {
        trackEvent(AnalyticsEvents.ClickShareBlog, { post_id: context.postId })
      }
      if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
        await (navigator as any).share(shareData)
        return
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        showToast('Link kopiert', 'success', 1600)
        return
      }
      const tw = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text || title)}`
      window.open(tw, '_blank', 'noopener,noreferrer')
    } catch {
      showToast('Teilen nicht möglich', 'error', 1600)
    }
  }

  return (
    <div className={`inline-flex items-center ${className}`.trim()}>
      <button
        type="button"
        onClick={doShare}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-orange-600 text-orange-600 hover:bg-orange-50 text-sm"
        aria-label="Teilen"
      >
        <FontAwesomeIcon icon="share" style="solid" />
        {label}
      </button>
    </div>
  )
}

