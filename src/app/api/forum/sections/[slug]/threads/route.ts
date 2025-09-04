import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

    const body = await req.json().catch(() => ({})) as { title?: string; body?: string | null }
    if (!body?.title || !body.title.trim()) return NextResponse.json({ error: 'Titel erforderlich' }, { status: 400 })
    if (!body?.body || !body.body.trim()) return NextResponse.json({ error: 'Inhalt erforderlich' }, { status: 400 })

    const { data: section } = await supabase
      .from('forum_sections')
      .select('id, is_archived')
      .eq('slug', slug)
      .maybeSingle()

    if (!section) return NextResponse.json({ error: 'Bereich nicht gefunden' }, { status: 404 })
    if ((section as any).is_archived) return NextResponse.json({ error: 'Bereich ist archiviert' }, { status: 400 })

    const { data, error } = await supabase
      .from('forum_threads')
      .insert({ section_id: (section as any).id, title: body.title.trim(), body: body.body.trim(), created_by: auth.user.id })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ id: (data as any).id }, { status: 201 })
  } catch (e: any) {
    try { const Sentry = await import('@sentry/nextjs'); Sentry.captureException(e); } catch {}
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}

