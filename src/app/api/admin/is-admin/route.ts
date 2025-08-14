import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    // Prefer RPC helper if available
    let isAdmin = false;
    try {
      const { data: rpcVal } = await supabase.rpc('current_user_is_admin');
      isAdmin = Boolean(rpcVal);
    } catch {
      // Fallback to table lookup if RPC not present
      const { data: row } = await supabase
        .from('user_settings')
        .select('is_admin')
        .eq('user_id', user.id)
        .maybeSingle();
      isAdmin = Boolean((row as any)?.is_admin);
    }

    return NextResponse.json({ isAdmin }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

