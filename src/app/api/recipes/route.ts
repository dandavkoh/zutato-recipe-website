import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type Difficulty = "einfach" | "mittel" | "schwer";

interface CreateRecipeRequestBody {
  name: string;
  description?: string;
  portions: number;
  difficulty: Difficulty;
  category_ids: string[];
  working_time_minutes?: number | null;
  cooking_time_minutes?: number | null;
  resting_time_minutes?: number | null;
  image_url?: string | null;
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateRecipeRequestBody;

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

    // 1) Create recipe
    const { data: recipeInsert, error: recipeError } = await supabase
      .from("recipes")
      .insert({
        name: body.name,
        description: body.description ?? null,
        portions: body.portions,
        difficulty: body.difficulty,
        working_time_minutes: body.working_time_minutes ?? null,
        cooking_time_minutes: body.cooking_time_minutes ?? null,
        resting_time_minutes: body.resting_time_minutes ?? null,
        image_url: body.image_url ?? null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (recipeError || !recipeInsert) {
      return NextResponse.json({ error: recipeError?.message || "Rezept konnte nicht erstellt werden" }, { status: 400 });
    }

    const recipeId = recipeInsert.id as string;

    // 1b) Insert category mappings (many-to-many)
    const uniqueCategoryIds = Array.from(new Set((body.category_ids || []).filter(Boolean)));
    if (uniqueCategoryIds.length > 0) {
      const { error: mapErr } = await supabase
        .from('recipe_categories_map')
        .insert(uniqueCategoryIds.map((cid) => ({ recipe_id: recipeId, category_id: cid, created_by: user.id })));
      if (mapErr) {
        return NextResponse.json({ error: mapErr.message }, { status: 400 });
      }
    }

    // 2) Insert sections that have a name. We treat unnamed/default section as null section_id for its ingredients
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
      // Build map: find each by sort_order & name correspondence
      for (const inserted of sectionInserts || []) {
        const match = namedSections.find(
          (s) => s.sort_order === inserted.sort_order && s.name.trim() === inserted.name
        );
        if (match) {
          sectionIdByTempId[match.tempId] = inserted.id;
        }
      }
    }

    // 3) Insert ingredients
    if ((body.ingredients || []).length > 0) {
      const ingredientsPayload = body.ingredients.map((ing) => ({
        recipe_id: recipeId,
        section_id: ing.sectionTempId ? sectionIdByTempId[ing.sectionTempId] ?? null : null,
        quantity: ing.quantity,
        unit_id: ing.unit_id,
        product_group_id: ing.product_group_id ?? null,
        product_id: ing.product_id ?? null,
        custom_ingredient_name: ing.custom_ingredient_name ?? null,
        sort_order: ing.sort_order,
      }));
      const { error: ingErr } = await supabase.from("recipe_ingredients").insert(ingredientsPayload);
      if (ingErr) {
        return NextResponse.json({ error: ingErr.message }, { status: 400 });
      }
    }

    // 4) Insert steps
    if ((body.steps || []).length > 0) {
      const stepsPayload = body.steps.map((st) => ({
        recipe_id: recipeId,
        step_number: st.step_number,
        instruction: st.instruction,
      }));
      const { error: stepErr } = await supabase.from("recipe_steps").insert(stepsPayload);
      if (stepErr) {
        return NextResponse.json({ error: stepErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ id: recipeId }, { status: 201 });
  } catch (e: any) {
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.captureException(e);
    } catch {}
    return NextResponse.json({ error: e?.message || "Unbekannter Fehler" }, { status: 500 });
  }
}

