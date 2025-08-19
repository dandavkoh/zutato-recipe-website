import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await _req.json().catch(() => ({})) as { reason?: string; details?: string }
    const reason = (body?.reason || '').trim()
    const details = (body?.details || '').trim()
    if (!reason) return NextResponse.json({ error: 'Grund erforderlich' }, { status: 400 })
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

    // Ensure the message belongs to the user (recipient or sender) – RLS also enforces, this is UX guard
    const { data: msg } = await supabase
      .from('user_messages')
      .select('id, sender_id, recipient_id')
      .eq('id', id)
      .maybeSingle()
    if (!msg || ![msg.sender_id, msg.recipient_id].includes(auth.user.id)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    const { error } = await supabase
      .from('content_reports')
      .insert({ user_message_id: id, reported_by: auth.user.id, reason, details: details || null })
    if (error) {
      if ((error as any).code === '23505') return NextResponse.json({ error: 'Du hast diese Nachricht bereits gemeldet' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}

