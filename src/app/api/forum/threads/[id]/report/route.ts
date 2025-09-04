import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

    const body = await _req.json().catch(() => ({})) as { reason?: string; details?: string }
    const reason = (body?.reason || '').trim()
    const details = (body?.details || '').trim()
    if (!reason) return NextResponse.json({ error: 'Grund erforderlich' }, { status: 400 })

    const { error } = await supabase.from('content_reports').insert({ forum_thread_id: id, reported_by: auth.user.id, reason, details: details || null })
    if (error) {
      if ((error as any).code === '23505') return NextResponse.json({ error: 'Du hast diesen Thread bereits gemeldet' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e: any) {
    try { const Sentry = await import('@sentry/nextjs'); Sentry.captureException(e); } catch {}
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}

