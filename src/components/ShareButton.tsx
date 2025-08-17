'use client'

import React from 'react'
import FontAwesomeIcon from '@/components/FontAwesomeIcon'
import Toast from '@/components/Toast'

type Props = {
  title: string
  text?: string
  url?: string
  className?: string
  label?: string
}

export default function ShareButton({ title, text, url, className = '', label = 'Teilen' }: Props) {
  const [toast, setToast] = React.useState<string | null>(null)

  const doShare = async () => {
    try {
      const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '')
      const shareData: ShareData = {
        title,
        text: text || title,
        url: shareUrl,
      }
      // Native share if available
      if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
        await (navigator as any).share(shareData)
        return
      }
      // Fallback: copy link
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        setToast('Link kopiert')
        return
      }
      // Last resort: open Twitter intent
      const tw = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text || title)}`
      window.open(tw, '_blank', 'noopener,noreferrer')
    } catch {
      setToast('Teilen nicht möglich')
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
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} durationMs={1600} />}
    </div>
  )
}

