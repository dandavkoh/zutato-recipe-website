import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ hasNickname: false }, { status: 401 });
    }

    // Prefer source of truth table for write path
    const { data: usRow, error: usErr } = await supabase
      .from('user_settings')
      .select('nickname')
      .eq('user_id', user.id)
      .maybeSingle();
    if (usErr) {
      return NextResponse.json({ error: usErr.message }, { status: 400 });
    }
    let nickname = (usRow as any)?.nickname as string | null;
    // Fallback to public view if not present in user_settings
    if (!nickname) {
      const { data, error } = await supabase
        .from('public_user_nicknames')
        .select('nickname')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error) {
        nickname = (data as any)?.nickname as string | null;
      }
    }
    return NextResponse.json({ hasNickname: Boolean(nickname && nickname.trim()), nickname: nickname || '' }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const body = (await request.json()) as { nickname?: string };
    const nickname = (body?.nickname || '').trim().toLowerCase();
    if (!nickname) {
      return NextResponse.json({ error: 'Accountname darf nicht leer sein' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, nickname }, { onConflict: 'user_id' });
    if (error) {
      const code = (error as any).code as string | undefined;
      if (code === '23505' || code === '409') {
        return NextResponse.json({ error: 'Dieser Accountname ist bereits vergeben.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

