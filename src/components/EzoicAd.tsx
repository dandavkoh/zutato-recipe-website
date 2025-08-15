'use client'

import React from 'react'

declare global {
  interface Window {
    ezstandalone?: any
  }
}

type Props = {
  placeholderId?: number
  required?: boolean
  sizes?: string | string[]
  className?: string
}

export default function EzoicAd({ placeholderId, required = false, sizes, className = '' }: Props) {
  const id = placeholderId ?? Number(process.env.NEXT_PUBLIC_EZOIC_HP_TOP_ID || 101)

  React.useEffect(() => {
    // Queue showAds, ezstandalone will run it once the library is ready (loaded by Klaro callback)
    // This will do nothing if the user hasn't made a consent choice yet (since we don't load the library in that case).
    try {
      // @ts-ignore
      window.ezstandalone = window.ezstandalone || {}
      // @ts-ignore
      ezstandalone.cmd = ezstandalone.cmd || []
      // @ts-ignore
      ezstandalone.cmd.push(function () {
        try {
          if (sizes || required) {
            const entry: any = { id }
            if (required) entry.required = true
            if (sizes) entry.sizes = sizes
            // @ts-ignore
            ezstandalone.showAds([entry])
          } else {
            // @ts-ignore
            ezstandalone.showAds(id)
          }
        } catch {}
      })
    } catch {}
  }, [id, required, sizes])

  return (
    <div className={`w-full flex justify-center ${className}`.trim()}>
      {/* Ezoic placeholder container */}
      <div id={`ezoic-pub-ad-placeholder-${id}`} className="min-h-[90px] w-full max-w-[980px]" aria-label="Anzeige" />
    </div>
  )
}

