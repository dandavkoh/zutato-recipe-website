import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({})) as { status?: 'open' | 'in_review' | 'resolved' | 'rejected'; resolution_notes?: string }
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    // Check admin
    let isAdmin = false
    try {
      const { data: rpcVal } = await supabase.rpc('current_user_is_admin')
      isAdmin = Boolean(rpcVal)
    } catch {}
    if (!isAdmin) return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })

    const payload: any = {}
    if (typeof body.status !== 'undefined') {
      payload.status = body.status
      if (body.status === 'resolved' || body.status === 'rejected') {
        payload.resolved_by = auth.user.id
        payload.resolved_at = new Date().toISOString()
      } else {
        payload.resolved_by = null
        payload.resolved_at = null
      }
    }
    if (typeof body.resolution_notes !== 'undefined') {
      payload.resolution_notes = body.resolution_notes || null
    }
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Keine Änderungen' }, { status: 400 })
    }

    const { error } = await supabase.from('content_reports').update(payload).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    try { const Sentry = await import('@sentry/nextjs'); Sentry.captureException(e); } catch {}
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}

