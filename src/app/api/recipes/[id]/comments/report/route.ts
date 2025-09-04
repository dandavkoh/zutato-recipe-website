import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json().catch(() => ({})) as { id?: string; reason?: string; details?: string }
    const commentId = (body?.id || '').trim()
    const reason = (body?.reason || '').trim()
    const details = (body?.details || '').trim()
    if (!commentId) return NextResponse.json({ error: 'Kommentar-ID fehlt' }, { status: 400 })
    if (!reason) return NextResponse.json({ error: 'Grund erforderlich' }, { status: 400 })

    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

    const { error } = await supabase
      .from('content_reports')
      .insert({ recipe_comment_id: commentId, reported_by: auth.user.id, reason, details: details || null })
    if (error) {
      if ((error as any).code === '23505') {
        return NextResponse.json({ error: 'Du hast diesen Kommentar bereits gemeldet' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e: any) {
    try { const Sentry = await import('@sentry/nextjs'); Sentry.captureException(e); } catch {}
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}

