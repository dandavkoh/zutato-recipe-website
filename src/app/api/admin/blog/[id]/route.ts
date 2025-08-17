import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

async function ensureAdmin(supabase: Awaited<ReturnType<typeof createClient>>): Promise<{ userId: string } | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  let isAdmin = false;
  try {
    const { data: rpcVal } = await supabase.rpc('current_user_is_admin');
    isAdmin = Boolean(rpcVal);
  } catch {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('is_admin')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    isAdmin = Boolean((settings as any)?.is_admin);
  }
  if (!isAdmin) return null;
  return { userId: auth.user.id };
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const admin = await ensureAdmin(supabase);
    if (!admin) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });

    const params = await context.params;
    const id = params.id;

    const body = (await request.json()) as {
      title?: string;
      slug?: string;
      content?: string;
      excerpt?: string | null;
      cover_image_url?: string;
      status?: 'draft' | 'published' | 'scheduled' | 'archived';
      language?: string;
    };

    const updatePayload: any = {};
    for (const [k, v] of Object.entries(body)) {
      if (typeof v !== 'undefined') (updatePayload as any)[k] = v;
    }
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Nichts zu aktualisieren' }, { status: 400 });
    }

    const { error } = await supabase
      .from('blog_posts')
      .update(updatePayload)
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const admin = await ensureAdmin(supabase);
    if (!admin) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });

    const params = await context.params;
    const id = params.id;

    // Soft delete by policy preference
    const { error } = await supabase
      .from('blog_posts')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: admin.userId })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

