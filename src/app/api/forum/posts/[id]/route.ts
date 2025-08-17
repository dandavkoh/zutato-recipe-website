import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { content?: string; is_deleted?: boolean }
  // Only owner can edit/soft-delete (admins handled by RLS/rpc in DB policies)
  let isAdmin = false
  try {
    const { data: rpcVal } = await supabase.rpc('current_user_is_admin')
    isAdmin = Boolean(rpcVal)
  } catch {}
  const { data: post } = await supabase
    .from('forum_posts')
    .select('user_id')
    .eq('id', id)
    .maybeSingle()
  if (!post) return NextResponse.json({ error: 'Beitrag nicht gefunden' }, { status: 404 })
  if (!isAdmin && (post as any).user_id !== auth.user.id) return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
  if (typeof body.content !== 'undefined' && (!body.content || !body.content.trim())) {
    return NextResponse.json({ error: 'Text erforderlich' }, { status: 400 })
  }
  const { error } = await supabase
    .from('forum_posts')
    .update({
      content: typeof body.content !== 'undefined' ? body.content.trim() : undefined,
      is_deleted: typeof body.is_deleted !== 'undefined' ? body.is_deleted : undefined,
    })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

