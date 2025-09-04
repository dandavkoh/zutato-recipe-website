import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  try {
    const params = await context.params;
    const postId = params.id;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('blog_comments')
      .select('id, user_id, comment, created_at, updated_at')
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ comments: data || [] }, { status: 200 });
  } catch (e: any) {
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.captureException(e);
    } catch {}
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

export async function POST(request: Request, context: Params) {
  try {
    const body = (await request.json()) as { comment?: string };
    const params = await context.params;
    const postId = params.id;

    const text = (body?.comment || '').trim();
    if (!text) {
      return NextResponse.json({ error: 'Kommentar darf nicht leer sein' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { error: insertErr } = await supabase.from('blog_comments').insert({
      post_id: postId,
      user_id: user.id,
      comment: text,
    });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e: any) {
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.captureException(e);
    } catch {}
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

export async function PUT(request: Request, _context: Params) {
  try {
    const body = (await request.json()) as { id?: string; comment?: string };
    const commentId = body?.id;
    const text = (body?.comment || '').trim();

    if (!commentId) {
      return NextResponse.json({ error: 'Kommentar-ID fehlt' }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ error: 'Kommentar darf nicht leer sein' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    // Allow admins to update any comment per RLS; fallback: if not owner, require admin
    const { error: updErr } = await supabase
      .from('blog_comments')
      .update({ comment: text })
      .eq('id', commentId);
    if (updErr) {
      let isAdmin = false;
      try {
        const { data: rpcVal } = await supabase.rpc('current_user_is_admin');
        isAdmin = Boolean(rpcVal);
      } catch {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('is_admin')
          .eq('user_id', user.id)
          .maybeSingle();
        isAdmin = Boolean((settings as any)?.is_admin);
      }
      if (!isAdmin) {
        return NextResponse.json({ error: updErr.message }, { status: 400 });
      }
      const retry = await supabase
        .from('blog_comments')
        .update({ comment: text })
        .eq('id', commentId);
      if (retry.error) {
        return NextResponse.json({ error: retry.error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.captureException(e);
    } catch {}
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

export async function DELETE(request: Request, _context: Params) {
  try {
    const body = (await request.json()) as { id?: string };
    const commentId = body?.id;

    if (!commentId) {
      return NextResponse.json({ error: 'Kommentar-ID fehlt' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    // Soft delete via is_deleted flag; allow admin per RLS. If blocked, check admin explicitly.
    const { error: delErr } = await supabase
      .from('blog_comments')
      .update({ is_deleted: true })
      .eq('id', commentId);
    if (delErr) {
      let isAdmin = false;
      try {
        const { data: rpcVal } = await supabase.rpc('current_user_is_admin');
        isAdmin = Boolean(rpcVal);
      } catch {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('is_admin')
          .eq('user_id', user.id)
          .maybeSingle();
        isAdmin = Boolean((settings as any)?.is_admin);
      }
      if (!isAdmin) {
        return NextResponse.json({ error: delErr.message }, { status: 400 });
      }
      const retry = await supabase
        .from('blog_comments')
        .update({ is_deleted: true })
        .eq('id', commentId);
      if (retry.error) {
        return NextResponse.json({ error: retry.error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

