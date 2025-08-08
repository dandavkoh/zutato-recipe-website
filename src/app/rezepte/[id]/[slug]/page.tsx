import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';

type Difficulty = 'einfach' | 'mittel' | 'schwer';

type RecipeDetails = {
  id: string;
  name: string;
  description: string | null;
  portions: number;
  difficulty: Difficulty;
  category_name: string | null;
  image_url: string | null;
  working_time_minutes: number | null;
  cooking_time_minutes: number | null;
  resting_time_minutes: number | null;
  created_at: string;
  creator_name: string | null;
  creator_email: string | null;
};

type IngredientRow = {
  id: string;
  recipe_id: string;
  section_name: string | null;
  section_sort_order: number | null;
  quantity: number;
  unit_name: string | null;
  unit_short_name: string | null;
  ingredient_display_name: string;
  sort_order: number;
};

type StepRow = {
  id: string;
  recipe_id: string;
  step_number: number;
  instruction: string;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function capitalize(word: string) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function formatTotalMinutes(w: number | null, c: number | null, r: number | null): string | null {
  const total = (w ?? 0) + (c ?? 0) + (r ?? 0);
  return total > 0 ? `${total} Min` : null;
}

function formatQuantity(qty: number): string {
  if (Number.isInteger(qty)) return String(qty);
  return qty.toString();
}

export async function generateMetadata({ params }: { params: { id: string; slug: string } }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('recipes_with_details')
    .select('name, description')
    .eq('id', params.id)
    .maybeSingle();

  if (!data) return { title: 'Rezept', description: 'Rezeptdetails' };

  const name = (data as any).name as string;
  const description = ((data as any).description as string | null) || 'Rezeptdetails';
  return {
    title: `${name} - Rezept`,
    description,
  };
}

export default async function RecipeDetailPage({ params }: { params: { id: string; slug: string } }) {
  const supabase = await createClient();

  const { data: recipe, error: recipeError } = await supabase
    .from('recipes_with_details')
    .select(
      'id, name, description, portions, difficulty, category_name, image_url, working_time_minutes, cooking_time_minutes, resting_time_minutes, created_at, creator_name, creator_email'
    )
    .eq('id', params.id)
    .maybeSingle();

  if (recipeError || !recipe) {
    notFound();
  }

  const { data: ingredients } = await supabase
    .from('recipe_ingredients_with_details')
    .select(
      'id, recipe_id, section_name, section_sort_order, quantity, unit_name, unit_short_name, ingredient_display_name, sort_order'
    )
    .eq('recipe_id', params.id)
    .order('section_sort_order', { ascending: true, nullsFirst: true })
    .order('sort_order', { ascending: true });

  const { data: steps } = await supabase
    .from('recipe_steps_with_details')
    .select('id, recipe_id, step_number, instruction')
    .eq('recipe_id', params.id)
    .order('step_number', { ascending: true });

  const r = recipe as RecipeDetails;
  const ingRows = (ingredients as IngredientRow[]) || [];
  const stepRows = (steps as StepRow[]) || [];

  const totalTime = formatTotalMinutes(r.working_time_minutes, r.cooking_time_minutes, r.resting_time_minutes);
  const difficultyLabel = capitalize(r.difficulty);
  const author = r.creator_name || r.creator_email || 'Unbekannt';

  // Group ingredients by section (null => Default/Unnamed)
  const grouped: Array<{ name: string | null; sortOrder: number | null; items: IngredientRow[] }> = [];
  const map = new Map<string, { name: string | null; sortOrder: number | null; items: IngredientRow[] }>();
  for (const row of ingRows) {
    const key = row.section_name ?? '__default__';
    if (!map.has(key)) {
      map.set(key, { name: row.section_name, sortOrder: row.section_sort_order, items: [] });
    }
    map.get(key)!.items.push(row);
  }
  for (const value of map.values()) grouped.push(value);
  grouped.sort((a, b) => {
    // Default section (null sortOrder) first
    const aKey = a.sortOrder == null ? -1 : a.sortOrder;
    const bKey = b.sortOrder == null ? -1 : b.sortOrder;
    return aKey - bKey;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{r.name}</h1>
              {r.description && <p className="text-gray-600 mb-4">{r.description}</p>}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span>👤 {author}</span>
                {r.category_name && <span>🏷️ {r.category_name}</span>}
                <span>🍽️ {r.portions} Portionen</span>
                <span>📊 {difficultyLabel}</span>
                {totalTime && <span>⏱️ {totalTime}</span>}
              </div>
            </div>
            <div className="md:col-span-1">
              <div className="w-full h-48 md:h-40 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg overflow-hidden flex items-center justify-center">
                {r.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl">🍽️</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Zutaten</h2>
            <div className="space-y-6">
              {grouped.map((group, idx) => (
                <div key={idx}>
                  {group.name && (
                    <h3 className="text-sm font-medium text-gray-700 mb-2">{group.name}</h3>
                  )}
                  <ul className="space-y-2">
                    {group.items.map((ing) => (
                      <li key={ing.id} className="flex items-start justify-between">
                        <span className="text-gray-900">
                          {formatQuantity(ing.quantity)} {ing.unit_short_name || ing.unit_name || ''} {ing.ingredient_display_name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Zubereitung</h2>
            <ol className="space-y-4">
              {stepRows.map((s) => (
                <li key={s.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Schritt {s.step_number}</div>
                  <div className="text-gray-900 whitespace-pre-line">{s.instruction}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}

