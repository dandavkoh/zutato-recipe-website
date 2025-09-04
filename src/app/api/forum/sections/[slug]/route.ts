import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    const body = await req.json().catch(() => ({})) as { title?: string; description?: string | null; sort_order?: number; is_archived?: boolean }
    const { error } = await supabase
      .from('forum_sections')
      .update({
        title: typeof body.title !== 'undefined' ? body.title : undefined,
        description: typeof body.description !== 'undefined' ? body.description : undefined,
        sort_order: typeof body.sort_order !== 'undefined' ? body.sort_order : undefined,
        is_archived: typeof body.is_archived !== 'undefined' ? body.is_archived : undefined,
      })
      .eq('slug', slug)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    try { const Sentry = await import('@sentry/nextjs'); Sentry.captureException(e); } catch {}
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    const { error } = await supabase.from('forum_sections').delete().eq('slug', slug)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    try { const Sentry = await import('@sentry/nextjs'); Sentry.captureException(e); } catch {}
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}

