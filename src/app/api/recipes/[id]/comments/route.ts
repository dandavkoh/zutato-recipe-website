import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  try {
    const params = await context.params;
    const recipeId = params.id;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('recipe_comments')
      .select('id, user_id, comment, created_at, updated_at')
      .eq('recipe_id', recipeId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ comments: data || [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

export async function POST(request: Request, context: Params) {
  try {
    const body = (await request.json()) as { comment?: string };
    const params = await context.params;
    const recipeId = params.id;

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

    const { error: insertErr } = await supabase.from('recipe_comments').insert({
      recipe_id: recipeId,
      user_id: user.id,
      comment: text,
    });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e: any) {
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

    // Update restricted by RLS policy (only owner can update)
    const { error: updErr } = await supabase
      .from('recipe_comments')
      .update({ comment: text })
      .eq('id', commentId);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
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

    // Soft delete via is_deleted flag; RLS ensures only owner can update
    const { error: delErr } = await supabase
      .from('recipe_comments')
      .update({ is_deleted: true })
      .eq('id', commentId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

