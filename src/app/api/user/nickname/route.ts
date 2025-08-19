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

    const { data: row, error } = await supabase
      .from('public_user_profile')
      .select('nickname')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const nickname = (row as any)?.nickname as string | null;
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
    if (!/^[a-zA-Z0-9_\-.]+$/.test(nickname)) {
      return NextResponse.json({ error: 'Nur Buchstaben, Zahlen, Unterstrich, Punkt oder Bindestrich erlaubt (keine Leerzeichen)' }, { status: 400 });
    }

    const { error } = await supabase
      .from('public_user_profile')
      .update({ nickname })
      .eq('user_id', user.id);
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

