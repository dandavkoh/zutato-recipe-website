import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import RecipeRatingSummary from '@/components/RecipeRatingSummary';

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
  created_by: string | null;
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

export default async function HomePage() {
  const supabase = await createClient();

  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentRows } = await supabase
    .from('recipes_with_details')
    .select('id, name, description, difficulty, working_time_minutes, cooking_time_minutes, resting_time_minutes, image_url, created_at, created_by')
    .gte('created_at', weekAgoIso)
    .order('created_at', { ascending: false })
    .limit(300);
  const recent: RecipeRow[] = (recentRows as RecipeRow[] | null) || [];

  const ids = recent.map((r) => r.id);
  let avgById: Record<string, { avg: number; count: number }> = {};
  if (ids.length > 0) {
    const { data: ratings } = await supabase
      .from('recipe_ratings')
      .select('recipe_id, rating')
      .in('recipe_id', ids)
      .eq('is_deleted', false);
    const grouped: Record<string, number[]> = {};
    for (const row of (ratings as any[]) || []) {
      const rid = row.recipe_id as string;
      const rt = row.rating as number;
      (grouped[rid] ||= []).push(rt);
    }
    for (const rid of ids) {
      const list = grouped[rid] || [];
      const count = list.length;
      const avg = count > 0 ? list.reduce((a, b) => a + b, 0) / count : 0;
      avgById[rid] = { avg, count };
    }
  }

  const top10 = [...recent]
    .sort((a, b) => {
      const ra = avgById[a.id] || { avg: 0, count: 0 };
      const rb = avgById[b.id] || { avg: 0, count: 0 };
      if (rb.avg !== ra.avg) return rb.avg - ra.avg;
      if (rb.count !== ra.count) return rb.count - ra.count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 10);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-50 to-orange-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Entdecke die besten
              <span className="text-orange-600 block">Rezepte der Welt</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Tausende von Rezepten von Hobbyköchen und Profis. Teile deine Lieblingsrezepte 
              und lerne neue Koch-Techniken in unserer lebendigen Community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/alle-rezepte" 
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-colors"
              >
                Alle Rezepte entdecken
              </Link>
              <Link 
                href="/rezept-einreichen" 
                className="bg-white hover:bg-gray-50 text-orange-600 border-2 border-orange-600 px-8 py-4 rounded-full font-semibold text-lg transition-colors"
              >
                Rezept teilen
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Beliebte Kategorien
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Hauptgerichte', icon: '🍖', count: '2.5k' },
              { name: 'Desserts', icon: '🍰', count: '1.8k' },
              { name: 'Vegetarisch', icon: '🥗', count: '1.2k' },
              { name: 'Schnell & Einfach', icon: '⚡', count: '3.1k' },
            ].map((category) => (
              <Link 
                key={category.name}
                href={`/kategorien/${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="group bg-gray-50 hover:bg-orange-50 rounded-xl p-6 text-center transition-colors"
              >
                <div className="text-4xl mb-3">{category.icon}</div>
                <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{category.count} Rezepte</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Recipes: Top 10 dieser Woche */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Empfohlene Rezepte
            </h2>
            <Link 
              href="/alle-rezepte" 
              className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
            >
              Alle anzeigen →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {top10.length === 0 ? (
              <div className="col-span-full text-center text-gray-600">Diese Woche noch keine Rezepte.</div>
            ) : (
              top10.map((recipe) => {
                const totalMinutes = getTotalMinutes(recipe);
                const timeText = totalMinutes ? `${totalMinutes} Min` : '–';
                const rating = { avg: (0), count: 0 };
                return (
                  <div key={recipe.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-6xl">
                      {recipe.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={recipe.image_url} alt={recipe.name} className="h-full w-full object-cover" />
                      ) : (
                        '🍽️'
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">{recipe.name}</h3>
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <span>⏱️ {timeText}</span>
                        <span>📊 {recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}</span>
                        <span>
                          <RecipeRatingSummary average={avgById[recipe.id]?.avg ?? null} count={avgById[recipe.id]?.count ?? 0} />
                        </span>
                      </div>
                      <Link 
                        href={`/rezepte/${recipe.id}/${toSlug(recipe.name)}`}
                        className="block w-full bg-orange-600 hover:bg-orange-700 text-white text-center py-2 rounded-lg font-medium transition-colors"
                      >
                        Rezept anzeigen
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Werde Teil unserer Community
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Teile deine Lieblingsrezepte, lerne von anderen Köchen und werde Teil 
              der größten Koch-Community Deutschlands.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">50.000+ Mitglieder</h3>
                <p className="text-gray-600">Aktive Community von Hobbyköchen und Profis</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">📖</div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">10.000+ Rezepte</h3>
                <p className="text-gray-600">Von traditionell bis modern, für jeden Geschmack</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Monatliche Challenges</h3>
                <p className="text-gray-600">Wettbewerbe und Events für alle Kochbegeisterten</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
