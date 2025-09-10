"use client"

import { useEffect } from 'react'
import { trackAnalyticsEvent, type AnalyticsEventName, type AnalyticsContentType } from '@/utils/analyticsEvents'

type Props = {
  event: AnalyticsEventName
  contentType?: AnalyticsContentType
  contentId?: string | null
  metadata?: Record<string, unknown>
}

export default function PageViewTracker({ event, contentType, contentId, metadata }: Props) {
  useEffect(() => {
    trackAnalyticsEvent({
      event_name: event,
      content_type: contentType,
      content_id: contentId,
      metadata,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}


