import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    const body = await req.json().catch(() => ({})) as { recipient_id?: string; subject?: string; content?: string }
    if (!body?.recipient_id) return NextResponse.json({ error: 'Empfänger fehlt' }, { status: 400 })
    if (!body?.subject || !body.subject.trim()) return NextResponse.json({ error: 'Betreff erforderlich' }, { status: 400 })
    if (!body?.content || !body.content.trim()) return NextResponse.json({ error: 'Nachricht erforderlich' }, { status: 400 })
    if (body.recipient_id === auth.user.id) return NextResponse.json({ error: 'Du kannst dir nicht selbst schreiben' }, { status: 400 })

    const { error } = await supabase.from('user_messages').insert({
      sender_id: auth.user.id,
      recipient_id: body.recipient_id,
      subject: body.subject.trim(),
      body: body.content.trim(),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e: any) {
    try { const Sentry = await import('@sentry/nextjs'); Sentry.captureException(e); } catch {}
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}

