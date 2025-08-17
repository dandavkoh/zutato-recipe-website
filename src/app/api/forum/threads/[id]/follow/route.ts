import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  const { error } = await supabase.from('forum_thread_follows').insert({ thread_id: id, user_id: auth.user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true }, { status: 201 })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  const { error } = await supabase.from('forum_thread_follows').delete().eq('thread_id', id).eq('user_id', auth.user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true }, { status: 200 })
}

