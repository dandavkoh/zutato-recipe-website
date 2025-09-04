import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    const body = await req.json().catch(() => ({})) as { title?: string; body?: string | null; is_deleted?: boolean; is_closed?: boolean; is_archived?: boolean }
    // Only owner can edit/soft-delete (admins handled by RLS in DB). Check ownership.
    let isAdmin = false
    try {
      const { data: rpcVal } = await supabase.rpc('current_user_is_admin')
      isAdmin = Boolean(rpcVal)
    } catch {}
    const { data: thr } = await supabase
      .from('forum_threads')
      .select('created_by')
      .eq('id', id)
      .maybeSingle()
    if (!thr) return NextResponse.json({ error: 'Thread nicht gefunden' }, { status: 404 })
    if (!isAdmin && (thr as any).created_by !== auth.user.id) return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    // Enforce non-empty body when provided
    if (typeof body.body !== 'undefined' && (!body.body || !String(body.body).trim())) {
      return NextResponse.json({ error: 'Inhalt erforderlich' }, { status: 400 })
    }
    const { error } = await supabase
      .from('forum_threads')
      .update({
        title: typeof body.title !== 'undefined' ? body.title : undefined,
        body: typeof body.body !== 'undefined' ? String(body.body).trim() : undefined,
        is_deleted: typeof body.is_deleted !== 'undefined' ? body.is_deleted : undefined,
        is_closed: typeof body.is_closed !== 'undefined' ? body.is_closed : undefined,
        is_archived: typeof body.is_archived !== 'undefined' ? body.is_archived : undefined,
      })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    try { const Sentry = await import('@sentry/nextjs'); Sentry.captureException(e); } catch {}
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}

