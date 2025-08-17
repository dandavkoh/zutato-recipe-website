import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import RecipeRatingSummary from '@/components/RecipeRatingSummary';

export const metadata = {
  title: 'Meine Rezepte - ZUTATO',
  description: 'Übersicht über deine eigenen Rezepte',
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
};

function getTotalMinutes(r: RecipeRow): number | null {
  const w = r.working_time_minutes ?? 0;
  const c = r.cooking_time_minutes ?? 0;
  const rest = r.resting_time_minutes ?? 0;
  const sum = w + c + rest;
  return sum > 0 ? sum : null;
}

function toSlug(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export default async function MeineRezeptePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect('/login');
  }

  const userId = userData.user.id;

  // Only my own recipes, exclude soft-deleted
  const { data, error } = await supabase
    .from('recipes')
    .select('id, name, description, difficulty, working_time_minutes, cooking_time_minutes, resting_time_minutes, image_url, created_at')
    .eq('created_by', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  const recipes: RecipeRow[] = (data as RecipeRow[]) || [];

  // Compute rating summary like on Alle-Rezepte
  const recipeIds = recipes.map((r) => r.id);
  const ratingSummaryById: Record<string, { average: number | null; count: number }> = {};
  if (recipeIds.length > 0) {
    const { data: ratings } = await supabase
      .from('recipe_ratings')
      .select('recipe_id, rating')
      .in('recipe_id', recipeIds)
      .eq('is_deleted', false);
    const grouped: Record<string, number[]> = {};
    for (const row of (ratings as any[]) || []) {
      const rid = row.recipe_id as string;
      const rt = row.rating as number;
      (grouped[rid] ||= []).push(rt);
    }
    for (const rid of recipeIds) {
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Meine Rezepte</h1>
              <p className="text-gray-600">Hier findest du deine eigenen Rezepte</p>
            </div>
            <Link href="/rezept-einreichen" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full font-medium transition-colors">
              Neues Rezept
            </Link>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {recipes.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-600">
              Du hast noch keine Rezepte erstellt.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {recipes.map((r) => {
                const total = getTotalMinutes(r);
                const timeText = total ? `${total} Min` : '–';
                return (
                  <div key={r.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative">
                      <div className="h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-6xl">
                        {r.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.image_url} alt={r.name} className="h-full w-full object-cover" />
                        ) : (
                          '🍽️'
                        )}
                      </div>
                      <div className="absolute top-4 right-4 bg-white bg-opacity-90 text-gray-600 px-2 py-1 rounded text-xs">
                        {new Date(r.created_at).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">{r.name}</h3>
                      {r.description ? (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{r.description}</p>
                      ) : (
                        <div className="mb-3 h-5"></div>
                      )}
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <span>⏱️ {timeText}</span>
                        <span>📊 {r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1)}</span>
                        <span>
                          <RecipeRatingSummary
                            average={ratingSummaryById[r.id]?.average ?? null}
                            count={ratingSummaryById[r.id]?.count ?? 0}
                          />
                        </span>
                      </div>
                      <Link
                        href={`/rezepte/${r.id}/${toSlug(r.name)}`}
                        className="block w-full bg-orange-600 hover:bg-orange-700 text-white text-center py-2 rounded-lg font-medium transition-colors"
                      >
                        Rezept anzeigen
                      </Link>
                      <div className="mt-2">
                        <Link
                          href={`/rezepte/${r.id}/${toSlug(r.name)}/bearbeiten`}
                          className="block w-full bg-white hover:bg-gray-50 text-orange-600 border-2 border-orange-600 text-center py-2 rounded-lg font-medium transition-colors"
                        >
                          Rezept bearbeiten
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

