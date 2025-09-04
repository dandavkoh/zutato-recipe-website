import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

    const body = await req.json().catch(() => ({})) as { last_read_post_id?: string | null }
    const payload = {
      thread_id: id,
      user_id: auth.user.id,
      last_read_post_id: body?.last_read_post_id ?? null,
      last_read_at: new Date().toISOString(),
    }

    // Upsert own read status
    const { error } = await supabase
      .from('forum_thread_reads')
      .upsert(payload, { onConflict: 'thread_id,user_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    try { const Sentry = await import('@sentry/nextjs'); Sentry.captureException(e); } catch {}
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}

