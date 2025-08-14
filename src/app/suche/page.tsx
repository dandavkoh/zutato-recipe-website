import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type RecipeResult = {
  id: string;
  name: string;
  category_id: string | null;
};

type RecipeRow = {
  id: string;
  name: string;
  description: string | null;
  difficulty: 'einfach' | 'mittel' | 'schwer';
  working_time_minutes: number | null;
  cooking_time_minutes: number | null;
  resting_time_minutes: number | null;
  image_url: string | null;
  created_at: string;
  category_name: string | null;
  created_by: string | null;
};

function toSlug(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

function formatTotalMinutes(w: number | null, c: number | null, r: number | null): string | null {
  const total = (w ?? 0) + (c ?? 0) + (r ?? 0);
  return total > 0 ? `${total} Min` : null;
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const qRaw = params.q;
  const q = Array.isArray(qRaw) ? qRaw[0] : qRaw || '';
  const term = (q || '').trim();

  const supabase = await createClient();

  let results: RecipeResult[] = [];
  if (term) {
    const { data } = await supabase.rpc('search_recipes', { term, limit_fts: 15, limit_fuzzy: 10 });
    results = (data as RecipeResult[]) || [];
  }

  // Fetch details for matching IDs to render nice cards
  const ids = results.map((r) => r.id);
  let recipes: RecipeRow[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from('recipes_with_details')
      .select('id, name, description, difficulty, working_time_minutes, cooking_time_minutes, resting_time_minutes, image_url, created_at, category_name, created_by')
      .in('id', ids);
    recipes = (data as RecipeRow[]) || [];
    // Keep the same order by rank coming from RPC
    const orderIndex = new Map(ids.map((id, idx) => [id, idx] as const));
    recipes.sort((a, b) => (orderIndex.get(a.id)! - orderIndex.get(b.id)!));
  }

  // Rating summary for result list
  const recipeIdsForRatings = recipes.map((r) => r.id);
  let ratingSummaryById: Record<string, { average: number | null; count: number }> = {};
  if (recipeIdsForRatings.length > 0) {
    const { data: ratings } = await supabase
      .from('recipe_ratings')
      .select('recipe_id, rating')
      .in('recipe_id', recipeIdsForRatings)
      .eq('is_deleted', false);
    const grouped: Record<string, number[]> = {};
    for (const row of (ratings as any[]) || []) {
      const rid = row.recipe_id as string;
      const rt = row.rating as number;
      if (!grouped[rid]) grouped[rid] = [];
      grouped[rid].push(rt);
    }
    for (const rid of recipeIdsForRatings) {
      const list = grouped[rid] || [];
      const count = list.length;
      const avg = count > 0 ? list.reduce((a, b) => a + b, 0) / count : null;
      ratingSummaryById[rid] = { average: avg, count };
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Suche</h1>
          <p className="text-gray-600 mt-2">
            {term ? (
              <>
                Ergebnisse für <span className="font-semibold">“{term}”</span>
              </>
            ) : (
              'Gib einen Suchbegriff im Header ein und drücke Enter'
            )}
          </p>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!term ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-600">
              Keine Suche ausgeführt.
            </div>
          ) : recipes.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-600">
              Keine Rezepte gefunden.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((r) => {
                const totalTime = formatTotalMinutes(r.working_time_minutes, r.cooking_time_minutes, r.resting_time_minutes);
                const rating = ratingSummaryById[r.id] || { average: null, count: 0 };
                const slug = toSlug(r.name);
                return (
                  <Link key={r.id} href={`/rezepte/${r.id}/${slug}`} className="group block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                    <div className="h-40 bg-gray-100 flex items-center justify-center">
                      {r.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-5xl">🍽️</span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-700">{r.name}</h3>
                      {r.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{r.description}</p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        {r.category_name && <span>🏷️ {r.category_name}</span>}
                        <span>📊 {r.difficulty}</span>
                        {totalTime && <span>⏱️ {totalTime}</span>}
                        <span>⭐ {rating.average ? rating.average.toFixed(1) : '–'} ({rating.count})</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

