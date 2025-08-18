import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type Difficulty = "einfach" | "mittel" | "schwer";

interface UpdateRecipeRequestBody {
  name: string;
  description?: string;
  portions: number;
  difficulty: Difficulty;
  category_id: string | null;
  working_time_minutes?: number | null;
  cooking_time_minutes?: number | null;
  resting_time_minutes?: number | null;
  image_url?: string | null; // optional update
  sections: Array<{ tempId: string; name: string; sort_order: number }>;
  ingredients: Array<{
    sectionTempId: string | null; // null means default unnamed section
    quantity: number;
    unit_id: string | null;
    product_group_id?: string | null;
    product_id?: string | null;
    custom_ingredient_name?: string | null;
    sort_order: number;
  }>;
  steps: Array<{ step_number: number; instruction: string }>;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = (await request.json()) as UpdateRecipeRequestBody;
    const params = await context.params;
    const recipeId = params.id;

    if (!body?.name || !body?.portions || !body?.difficulty) {
      return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    // Ensure user owns the recipe or is admin
    const { data: recipeRow, error: fetchErr } = await supabase
      .from("recipes")
      .select("id, created_by")
      .eq("id", recipeId)
      .maybeSingle();
    if (fetchErr || !recipeRow) {
      return NextResponse.json({ error: fetchErr?.message || "Rezept existiert nicht" }, { status: 404 });
    }
    if (recipeRow.created_by !== user.id) {
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
        return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
      }
    }

    // 1) Update recipe metadata
    const updatePayload: any = {
      name: body.name,
      description: body.description ?? null,
      portions: body.portions,
      difficulty: body.difficulty,
      category_id: body.category_id,
      working_time_minutes: body.working_time_minutes ?? null,
      cooking_time_minutes: body.cooking_time_minutes ?? null,
      resting_time_minutes: body.resting_time_minutes ?? null,
    };
    if (typeof body.image_url !== 'undefined') {
      updatePayload.image_url = body.image_url;
    }
    const { error: updErr } = await supabase
      .from("recipes")
      .update(updatePayload)
      .eq("id", recipeId);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    // 2) Clear existing children (ingredients -> steps -> sections) to re-create from payload
    const { error: delIngErr } = await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
    if (delIngErr) {
      return NextResponse.json({ error: delIngErr.message }, { status: 400 });
    }
    const { error: delStepsErr } = await supabase.from('recipe_steps').delete().eq('recipe_id', recipeId);
    if (delStepsErr) {
      return NextResponse.json({ error: delStepsErr.message }, { status: 400 });
    }
    const { error: delSecErr } = await supabase.from('recipe_ingredient_sections').delete().eq('recipe_id', recipeId);
    if (delSecErr) {
      return NextResponse.json({ error: delSecErr.message }, { status: 400 });
    }

    // 3) Re-insert sections (named only) and map temp ids
    const namedSections = (body.sections || []).filter((s) => s.name && s.name.trim());
    const sectionIdByTempId: Record<string, string> = {};
    if (namedSections.length > 0) {
      const { data: sectionInserts, error: secErr } = await supabase
        .from("recipe_ingredient_sections")
        .insert(
          namedSections.map((s) => ({
            recipe_id: recipeId,
            name: s.name.trim(),
            sort_order: s.sort_order,
          }))
        )
        .select("id, name, sort_order");
      if (secErr) {
        return NextResponse.json({ error: secErr.message }, { status: 400 });
      }
      for (const inserted of sectionInserts || []) {
        const match = namedSections.find(
          (s) => s.sort_order === inserted.sort_order && s.name.trim() === inserted.name
        );
        if (match) {
          sectionIdByTempId[match.tempId] = inserted.id;
        }
      }
    }

    // 4) Upsert ingredients and remove stale ones
    const ingredientsList = (body.ingredients || []).map((ing) => ({
      recipe_id: recipeId,
      section_id: ing.sectionTempId ? sectionIdByTempId[ing.sectionTempId] ?? null : null,
      quantity: ing.quantity,
      unit_id: ing.unit_id,
      product_group_id: ing.product_group_id ?? null,
      product_id: ing.product_id ?? null,
      custom_ingredient_name: ing.custom_ingredient_name ?? null,
      sort_order: ing.sort_order,
    }));

    // Delete previous and insert new in a deterministic sequence (emulating transaction)
    const { error: delOldIngErr } = await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
    if (delOldIngErr) {
      return NextResponse.json({ error: delOldIngErr.message }, { status: 400 });
    }
    if (ingredientsList.length > 0) {
      const { error: insNewIngErr } = await supabase.from('recipe_ingredients').insert(ingredientsList);
      if (insNewIngErr) {
        return NextResponse.json({ error: insNewIngErr.message }, { status: 400 });
      }
    }

    // 5) Insert steps (wipe-and-replace) with normalized numbering 1..n
    const stepsList = (body.steps || []).filter((s) => s && typeof s.step_number === 'number');
    if (stepsList.length > 0) {
      const normalized = stepsList
        .sort((a, b) => a.step_number - b.step_number)
        .map((s, idx) => ({ step_number: idx + 1, instruction: s.instruction }));

      const stepsPayload = normalized.map((st) => ({
        recipe_id: recipeId,
        step_number: st.step_number,
        instruction: st.instruction,
      }));

      const { error: stepsInsErr } = await supabase.from('recipe_steps').insert(stepsPayload);
      if (stepsInsErr) {
        return NextResponse.json({ error: stepsInsErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ id: recipeId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unbekannter Fehler" }, { status: 500 });
  }
}


export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const recipeId = params.id;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    // Admin-only soft delete to align with RLS in migration
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
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const { error: delErr } = await supabase
      .from('recipes')
      .update({ is_deleted: true })
      .eq('id', recipeId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}

