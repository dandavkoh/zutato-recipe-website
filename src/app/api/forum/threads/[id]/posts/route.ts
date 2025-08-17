import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { content?: string }
  if (!body?.content || !body.content.trim()) return NextResponse.json({ error: 'Text erforderlich' }, { status: 400 })

  // Thread must be visible/open/not archived – RLS enforces; we can early-check flags for UX (optional)
  const { data: thread } = await supabase
    .from('forum_threads')
    .select('id, title, is_deleted, is_closed, is_archived')
    .eq('id', id)
    .maybeSingle()
  if (!thread || (thread as any).is_deleted) return NextResponse.json({ error: 'Thread nicht gefunden' }, { status: 404 })
  if ((thread as any).is_closed || (thread as any).is_archived) return NextResponse.json({ error: 'Thread geschlossen/archiviert' }, { status: 400 })

  const { error } = await supabase.from('forum_posts').insert({ thread_id: id, user_id: auth.user.id, content: body.content.trim() })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Notify followers (best-effort, bypass RLS via service role if available)
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (serviceKey && supabaseUrl) {
      const admin = createServiceClient(supabaseUrl, serviceKey)
      const { data: follows } = await admin
        .from('forum_thread_follows')
        .select('user_id')
        .eq('thread_id', id)
      const recipients = ((follows as any[]) || []).map((f) => f.user_id as string).filter((uid) => uid && uid !== auth.user.id)
      if (recipients.length > 0) {
        const subject = `Neuer Beitrag in: ${(thread as any).title || 'Thread'}`
        const bodyText = `${(body.content || '').slice(0, 200)}${(body.content || '').length > 200 ? '…' : ''}`
        const rows = recipients.map((rid) => ({ sender_id: auth.user.id, recipient_id: rid, subject, body: bodyText, thread_id: id }))
        await admin.from('user_messages').insert(rows)
      }
    }
  } catch {}
  return NextResponse.json({ success: true }, { status: 201 })
}

