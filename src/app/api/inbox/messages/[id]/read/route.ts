import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const { error } = await supabase
    .from('user_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_id', auth.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true }, { status: 200 })
}

