"use client"

import { createClient } from '@/utils/supabase/client'

export type AnalyticsEventName =
  | 'page_view'
  | 'recipe_view'
  | 'blog_view'
  | 'blog_post_view'
  | 'forum_view'
  | 'forum_section_view'
  | 'forum_thread_view'

export type AnalyticsContentType =
  | 'page'
  | 'recipe'
  | 'blog'
  | 'blog_post'
  | 'forum'
  | 'forum_section'
  | 'forum_thread'

export interface TrackEventInput {
  event_name: AnalyticsEventName
  content_type?: AnalyticsContentType
  content_id?: string | null
  metadata?: Record<string, unknown>
}

function getAnonymousId(): string {
  try {
    const key = 'zutato_anon_id'
    const existing = window.localStorage.getItem(key)
    if (existing) return existing
    const next = crypto.getRandomValues(new Uint32Array(4)).join('-')
    window.localStorage.setItem(key, next)
    return next
  } catch {
    return 'unknown'
  }
}

export async function trackAnalyticsEvent(input: TrackEventInput): Promise<void> {
  try {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth?.user?.id ?? null
    const anonId = getAnonymousId()
    const pageUrl = typeof window !== 'undefined' ? window.location.href : undefined
    const pagePath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined
    const referrer = typeof document !== 'undefined' ? document.referrer : undefined
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined

    await supabase.from('analytics_events').insert({
      user_id: userId,
      anonymous_id: anonId,
      session_id: null,
      event_name: input.event_name,
      content_type: input.content_type ?? null,
      content_id: input.content_id ?? null,
      page_url: pageUrl ?? null,
      page_path: pagePath ?? null,
      referrer: referrer ?? null,
      user_agent: userAgent ?? null,
      metadata: input.metadata ?? {},
    })
  } catch {
    // Best-effort; ignore errors
  }
}


