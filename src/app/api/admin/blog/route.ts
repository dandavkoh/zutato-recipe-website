import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title: string;
      slug: string;
      content: string;
      excerpt?: string | null;
      cover_image_url: string;
      status: 'draft' | 'published' | 'scheduled' | 'archived';
      language?: string;
    };

    if (!body?.title || !body?.slug || !body?.content || !body?.cover_image_url) {
      return NextResponse.json({ error: 'Ungültige Eingaben' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

    // Check admin
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
    if (!isAdmin) return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title: body.title,
        slug: body.slug,
        content: body.content,
        excerpt: body.excerpt ?? null,
        cover_image_url: body.cover_image_url,
        status: body.status,
        language: body.language ?? 'de',
        author_id: auth.user.id,
      })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ id: (data as any).id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

