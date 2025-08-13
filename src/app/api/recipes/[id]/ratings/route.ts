import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  try {
    const { params } = await context;
    const recipeId = params.id;

    const supabase = await createClient();

    // Aggregate average and count
    const { data: ratingRows, error: ratingsErr } = await supabase
      .from('recipe_ratings')
      .select('recipe_id, rating')
      .eq('recipe_id', recipeId)
      .eq('is_deleted', false);

    if (ratingsErr) {
      return NextResponse.json({ error: ratingsErr.message }, { status: 400 });
    }

    const ratings = (ratingRows || []).map((r: any) => r.rating as number);
    const count = ratings.length;
    const average = count > 0 ? ratings.reduce((a, b) => a + b, 0) / count : null;

    // Determine if current user has rated and what value
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userHasRated = false;
    let userRating: number | null = null;
    if (user) {
      const { data: myRatingRow } = await supabase
        .from('recipe_ratings')
        .select('rating')
        .eq('recipe_id', recipeId)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .maybeSingle();
      if (myRatingRow) {
        userHasRated = true;
        userRating = (myRatingRow as any).rating as number;
      }
    }

    return NextResponse.json(
      {
        average,
        count,
        userHasRated,
        userRating,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

export async function POST(request: Request, context: Params) {
  try {
    const body = (await request.json()) as { rating?: number };
    const { params } = await context;
    const recipeId = params.id;

    const rating = Number(body?.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Bewertung muss zwischen 1 und 5 liegen' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    // Check if user has already rated this recipe
    const { data: existing } = await supabase
      .from('recipe_ratings')
      .select('id')
      .eq('recipe_id', recipeId)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Bereits bewertet' }, { status: 409 });
    }

    const { error: insertErr } = await supabase.from('recipe_ratings').insert({
      recipe_id: recipeId,
      user_id: user.id,
      rating,
    });
    if (insertErr) {
      // Unique violation safeguard
      if ((insertErr as any).code === '23505') {
        return NextResponse.json({ error: 'Bereits bewertet' }, { status: 409 });
      }
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

