import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import RecipeRatingSummary from '@/components/RecipeRatingSummary';
import DurationFilter from '@/components/DurationFilter';
import IngredientFilter from '@/components/IngredientFilter';

export const metadata = {
  title: 'Alle Rezepte - KochMeister',
  description: 'Entdecke alle Rezepte unserer Community. Filtere nach Kategorie, Schwierigkeit und sortiere nach Neueste, Bewertung oder Zeit.',
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
  creator_email: string | null;
  creator_name: string | null;
  created_by: string | null;
};

function capitalize(word: string) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function toNum(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function getTotalMinutes(r: RecipeRow): number | null {
  const w = toNum(r.working_time_minutes);
  const c = toNum(r.cooking_time_minutes);
  const rest = toNum(r.resting_time_minutes);
  const sum = w + c + rest;
  return sum > 0 ? sum : null;
}

function formatRelativeTime(dateStr: string): string {
  const created = new Date(dateStr).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - created);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Minute${minutes === 1 ? '' : 'n'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Stunde${hours === 1 ? '' : 'n'}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} Tag${days === 1 ? '' : 'en'}`;
  const weeks = Math.floor(days / 7);
  return `vor ${weeks} Woche${weeks === 1 ? '' : 'n'}`;
}

export default async function AlleRezeptePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const qp = await searchParams;
  const pageRaw = qp.page;
  const cat = Array.isArray(qp.cat) ? qp.cat[0] : qp.cat || '';
  const diff = Array.isArray(qp.diff) ? qp.diff[0] : qp.diff || '';
  const sort = (Array.isArray(qp.sort) ? qp.sort[0] : qp.sort || 'newest') as 'newest' | 'rating' | 'work';
  const maxTotalRaw = Array.isArray(qp.max) ? qp.max[0] : qp.max || '';
  const ingRaw = Array.isArray(qp.ing) ? qp.ing[0] : qp.ing || '';
  const allowedTokens = parseIngredientTokens(ingRaw);
  type Key = '15' | '30' | '60' | '120' | 'gt120' | 'all' | '';
  const maxKey: Key = (maxTotalRaw as Key) || '';
  const maxConfig = (() => {
    switch (maxKey) {
      case '15': return { type: 'lte' as const, minutes: 15 };
      case '30': return { type: 'lte' as const, minutes: 30 };
      case '60': return { type: 'lte' as const, minutes: 60 };
      case '120': return { type: 'lte' as const, minutes: 120 };
      case 'gt120': return { type: 'gt' as const, minutes: 120 };
      case 'all':
      case '':
      default: return { type: 'all' as const };
    }
  })();

  const pageSize = 10;
  const pageNum = Math.max(1, parseInt(Array.isArray(pageRaw) ? pageRaw[0] || '1' : pageRaw || '1'));
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize;

  const supabase = await createClient();

  type Category = { id: string; name: string };
  const { data: categoriesRows } = await supabase
    .from('recipe_categories')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true });
  const categories: Category[] = (categoriesRows as Category[] | null) || [];

  let recipes: RecipeRow[] = [];
  let hasNext = false;

  if (sort === 'newest') {
    let base = supabase
      .from('recipes_with_details')
      .select('id, name, description, difficulty, working_time_minutes, cooking_time_minutes, resting_time_minutes, image_url, created_at, category_name, creator_email, creator_name, created_by');
    if (cat) base = base.eq('category_id', cat);
    if (diff) base = base.eq('difficulty', diff);
    const { data: allRows } = await base.order('created_at', { ascending: false }).limit(300);
    let allRecipes: RecipeRow[] = (allRows as RecipeRow[]) || [];
    if (allowedTokens.length > 0) {
      // Constrain by allowed ingredients client-side for now by fetching ingredients per recipe (batched)
      const ids = allRecipes.map((r) => r.id);
      if (ids.length > 0) {
        const { data: ingRows } = await supabase
          .from('recipe_ingredients_with_details')
          .select('recipe_id, product_id, product_group_id')
          .in('recipe_id', ids);
        const byRecipe: Record<string, Array<{ product_id: string | null; product_group_id: string | null }>> = {};
        for (const row of (ingRows as any[]) || []) {
          (byRecipe[row.recipe_id] ||= []).push({ product_id: row.product_id ?? null, product_group_id: row.product_group_id ?? null });
        }
        const allowed = new Set(allowedTokens);
        allRecipes = allRecipes.filter((r) => {
          const items = byRecipe[r.id] || [];
          // A recipe is valid if every ingredient maps to an allowed token
          return items.every((it) => {
            const token = it.product_id ? (`p:${it.product_id}` as const) : it.product_group_id ? (`g:${it.product_group_id}` as const) : null;
            return token ? allowed.has(token) : false;
          });
        });
      }
    }
    if (maxConfig.type !== 'all') {
      allRecipes = allRecipes.filter((r) => {
        const sum = toNum(r.working_time_minutes) + toNum(r.cooking_time_minutes) + toNum(r.resting_time_minutes);
        if (sum <= 0) return false; // exclude unknown duration when filtering
        if (maxConfig.type === 'lte') return sum <= maxConfig.minutes;
        if (maxConfig.type === 'gt') return sum > maxConfig.minutes;
        return true;
      });
    }
    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;
    hasNext = allRecipes.length > end;
    recipes = allRecipes.slice(start, end);
  } else {
    let base = supabase
      .from('recipes_with_details')
      .select('id, name, description, difficulty, working_time_minutes, cooking_time_minutes, resting_time_minutes, image_url, created_at, category_name, creator_email, creator_name, created_by');
    if (cat) base = base.eq('category_id', cat);
    if (diff) base = base.eq('difficulty', diff);
    const { data: allRows } = await base.order('created_at', { ascending: false }).limit(300);
    let allRecipes: RecipeRow[] = (allRows as RecipeRow[]) || [];
    if (maxConfig.type !== 'all') {
      allRecipes = allRecipes.filter((r) => {
        const sum = toNum(r.working_time_minutes) + toNum(r.cooking_time_minutes) + toNum(r.resting_time_minutes);
        if (sum <= 0) return false;
        if (maxConfig.type === 'lte') return sum <= maxConfig.minutes;
        if (maxConfig.type === 'gt') return sum > maxConfig.minutes;
        return true;
      });
    }

    if (sort === 'work') {
      const getWork = (r: RecipeRow) => (r.working_time_minutes == null ? Infinity : r.working_time_minutes);
      allRecipes.sort((a, b) => getWork(a) - getWork(b));
      const start = (pageNum - 1) * pageSize;
      const end = start + pageSize;
      hasNext = allRecipes.length > end;
      recipes = allRecipes.slice(start, end);
    } else {
      const ids = allRecipes.map((r) => r.id);
      const avgById: Record<string, { avg: number; count: number }> = {};
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
      allRecipes.sort((a, b) => {
        const ra = avgById[a.id] || { avg: 0, count: 0 };
        const rb = avgById[b.id] || { avg: 0, count: 0 };
        if (rb.avg !== ra.avg) return rb.avg - ra.avg;
        if (rb.count !== ra.count) return rb.count - ra.count;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      const start = (pageNum - 1) * pageSize;
      const end = start + pageSize;
      hasNext = allRecipes.length > end;
      recipes = allRecipes.slice(start, end);
    }
  }

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
      if (!grouped[rid]) grouped[rid] = [];
      grouped[rid].push(rt);
    }
    for (const rid of recipeIds) {
      const list = grouped[rid] || [];
      const count = list.length;
      const avg = count > 0 ? list.reduce((a, b) => a + b, 0) / count : null;
      ratingSummaryById[rid] = { average: avg, count };
    }
  }

  const authorIds = Array.from(new Set((recipes.map((r) => r.created_by).filter((v): v is string => Boolean(v)))));
  let nicknameByUserId: Record<string, string> = {};
  if (authorIds.length > 0) {
    const { data: nickRows } = await supabase
      .from('public_user_profile')
      .select('user_id, nickname')
      .in('user_id', authorIds);
    const rows = (nickRows as { user_id: string; nickname: string | null }[] | null) || [];
    nicknameByUserId = Object.fromEntries(rows.filter(r => Boolean(r.nickname)).map(r => [r.user_id, r.nickname as string]));
  }
  const toSlug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

  function parseIngredientTokens(s: string): Array<`p:${string}` | `g:${string}`> {
    if (!s) return [];
    return s
      .split(',')
      .map((t) => t.trim())
      .filter((t) => /^([pg]):[A-Za-z0-9-]+$/.test(t)) as Array<`p:${string}` | `g:${string}`>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Alle Rezepte</h1>
              <p className="text-gray-600">Entdecke die neuesten Kreationen unserer Community</p>
            </div>
            <div className="mt-4 md:mt-0 w-full md:w-auto">
              <Link href="/rezept-einreichen" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full font-medium transition-colors block w-full text-center md:inline-block md:w-auto">Rezept einreichen</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form className="flex flex-wrap gap-4" method="get">
            <input type="hidden" name="page" value="1" />
            {/* Sort first: Bewertung, Neueste zuerst, Arbeitszeit */}
            <select name="sort" defaultValue={sort} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="rating">Bewertung</option>
              <option value="newest">Neueste zuerst</option>
              <option value="work">Arbeitszeit</option>
            </select>
            {/* Categories */}
            <select name="cat" defaultValue={cat} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="">Alle Kategorien</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {/* Difficulty */}
            <select name="diff" defaultValue={diff} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="">Alle Schwierigkeiten</option>
              <option value="einfach">Einfach</option>
              <option value="mittel">Mittel</option>
              <option value="schwer">Schwer</option>
            </select>
            {/* Total duration filter */}
            <DurationFilter initialKey={(maxKey && maxKey !== 'all' ? maxKey : 'all') as any} />
            {/* Ingredient filter */}
            <IngredientFilter initialTokens={ingRaw} />
            <button type="submit" className="px-5 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700">Filtern</button>
          </form>
        </div>
      </section>

      {/* Recipes Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recipes.map((recipe) => {
              const totalMinutes = getTotalMinutes(recipe);
              const timeText = totalMinutes ? `${totalMinutes} Min` : '–';
              const difficultyText = capitalize(recipe.difficulty);
              const authorNick = recipe.created_by ? nicknameByUserId[recipe.created_by] : null;
              const isNew = Date.now() - new Date(recipe.created_at).getTime() < 1000 * 60 * 60 * 24;
              const dateText = formatRelativeTime(recipe.created_at);
              return (
                <div key={recipe.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <div className="h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-6xl">
                      {recipe.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={recipe.image_url} alt={recipe.name} className="h-full w-full object-cover" />
                      ) : (
                        '🍽️'
                      )}
                    </div>
                    {isNew && (
                      <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">Neu</div>
                    )}
                    <div className="absolute top-4 right-4 bg-white bg-opacity-90 text-gray-600 px-2 py-1 rounded text-xs">{dateText}</div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold text-lg text-gray-900 mb-2">{recipe.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      von {recipe.created_by && authorNick ? (
                        <Link href={`/user/${recipe.created_by}`} className="text-orange-700 hover:underline">{authorNick}</Link>
                      ) : (
                        (recipe.creator_name || recipe.creator_email || 'Unbekannt')
                      )}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>⏱️ {timeText}</span>
                      <span>📊 {difficultyText}</span>
                      <span>
                        <RecipeRatingSummary average={ratingSummaryById[recipe.id]?.average ?? null} count={ratingSummaryById[recipe.id]?.count ?? 0} />
                      </span>
                    </div>
                    <Link href={`/rezepte/${recipe.id}/${toSlug(recipe.name)}`} className="block w-full bg-orange-600 hover:bg-orange-700 text-white text-center py-2 rounded-lg font-medium transition-colors">Rezept anzeigen</Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-12">
            {pageNum > 1 && (
              <Link href={`/alle-rezepte?page=${pageNum - 1}`} className="bg-white hover:bg-gray-50 text-orange-600 border-2 border-orange-600 px-6 py-2 rounded-full font-medium transition-colors">Zurück</Link>
            )}
            {hasNext && (
              <Link href={`/alle-rezepte?page=${pageNum + 1}`} className="bg-white hover:bg-gray-50 text-orange-600 border-2 border-orange-600 px-6 py-2 rounded-full font-medium transition-colors">Weitere Rezepte laden</Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

