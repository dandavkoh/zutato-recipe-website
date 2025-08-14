import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  try {
    const { params } = await context;
    const recipeId = params.id;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ inCookbook: false }, { status: 200 });
    }

    const { data: row } = await supabase
      .from('user_cookbook_recipes')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_id', recipeId)
      .maybeSingle();

    return NextResponse.json({ inCookbook: Boolean(row) }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

export async function POST(_request: Request, context: Params) {
  try {
    const { params } = await context;
    const recipeId = params.id;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    // Insert mapping; unique constraint prevents duplicates
    const { error: insertErr } = await supabase.from('user_cookbook_recipes').insert({
      user_id: user.id,
      recipe_id: recipeId,
    });
    if (insertErr) {
      // Unique violation safeguard
      if ((insertErr as any).code === '23505') {
        return NextResponse.json({ success: true }, { status: 200 });
      }
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Params) {
  try {
    const { params } = await context;
    const recipeId = params.id;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { error: delErr } = await supabase
      .from('user_cookbook_recipes')
      .delete()
      .eq('user_id', user.id)
      .eq('recipe_id', recipeId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

