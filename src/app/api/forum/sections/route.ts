import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { slug?: string; title?: string; description?: string | null; sort_order?: number; is_archived?: boolean }
  if (!body?.slug || !body?.title) return NextResponse.json({ error: 'slug und title erforderlich' }, { status: 400 })

  const { error } = await supabase
    .from('forum_sections')
    .insert({ slug: body.slug, title: body.title, description: body.description ?? null, sort_order: body.sort_order ?? 0, is_archived: !!body.is_archived })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true }, { status: 201 })
}

