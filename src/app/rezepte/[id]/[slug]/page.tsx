import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import ShareButton from '@/components/ShareButton';
import RateRecipeButton from '@/components/RateRecipeButton';
import AdminRecipeActions from '@/components/AdminRecipeActions';
import IngredientsWithPortionScaler from '@/components/IngredientsWithPortionScaler';
import ReportRecipeDialog from '@/components/ReportRecipeDialog';

type Difficulty = 'einfach' | 'mittel' | 'schwer';

type RecipeDetails = {
  id: string;
  name: string;
  description: string | null;
  portions: number;
  difficulty: Difficulty;
  image_url: string | null;
  working_time_minutes: number | null;
  cooking_time_minutes: number | null;
  resting_time_minutes: number | null;
  created_at: string;
  creator_name: string | null;
  creator_email: string | null;
  created_by: string | null;
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

// formatQuantity removed; quantities are formatted in client scaler component

type RouteParams = { id: string; slug: string };

export async function generateMetadata(props: { params: Promise<RouteParams> }): Promise<Metadata> {
  const supabase = await createClient();
  const { id, slug } = await props.params;
  const { data } = await supabase
    .from('recipes_with_details')
    .select('name, description, image_url, created_by, creator_name, creator_email')
    .eq('id', id)
    .maybeSingle();

  if (!data) return { title: 'Rezept', description: 'Rezeptdetails' };

  const name = (data as any).name as string;
  const description = ((data as any).description as string | null) || 'Rezeptdetails';
  const imageUrl = ((data as any).image_url as string | null) || null;

  // Der vollständige kanonische Pfad inkl. Slug aus der Route
  const url = `/rezepte/${id}/${slug}`;

  return {
    title: `${name} - Rezept`,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'article',
      title: `${name} - Rezept`,
      description,
      url,
      images: [
        {
          // Prefer our dynamic OG image route which includes title, rating, etc.
          url: `${url}/opengraph-image`,
          alt: name,
          width: 1200,
          height: 630,
        },
        // Fallback to the recipe image if available
        ...(imageUrl ? [{ url: imageUrl, alt: name }] : []),
      ],
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: `${name} - Rezept` as string,
      description,
      images: [`${url}/opengraph-image`, ...(imageUrl ? [imageUrl] : [])],
      creator: '@zutato',
    },
  };
}

export default async function RecipeDetailPage(props: { params: Promise<RouteParams>; searchParams?: Promise<{ commentsPage?: string }> }) {
  const supabase = await createClient();
  const { id, slug } = await props.params;
  const q = props.searchParams ? await props.searchParams : undefined;
  const search = q as any;

  const { data: recipe, error: recipeError } = await supabase
    .from('recipes_with_details')
    .select(
      'id, name, description, portions, difficulty, image_url, working_time_minutes, cooking_time_minutes, resting_time_minutes, created_at, creator_name, creator_email, created_by'
    )
    .eq('id', id)
    .maybeSingle();

  if (recipeError || !recipe) {
    notFound();
  }

  const { data: ingredients } = await supabase
    .from('recipe_ingredients_with_details')
    .select(
      'id, recipe_id, section_name, section_sort_order, quantity, unit_name, unit_short_name, ingredient_display_name, sort_order'
    )
    .eq('recipe_id', id)
    .order('section_sort_order', { ascending: true, nullsFirst: true })
    .order('sort_order', { ascending: true });

  const { data: steps } = await supabase
    .from('recipe_steps_with_details')
    .select('id, recipe_id, step_number, instruction')
    .eq('recipe_id', id)
    .order('step_number', { ascending: true });

  const r = recipe as RecipeDetails;
  const ingRows = (ingredients as IngredientRow[]) || [];
  const stepRows = (steps as StepRow[]) || [];

  const totalTime = formatTotalMinutes(r.working_time_minutes, r.cooking_time_minutes, r.resting_time_minutes);
  const difficultyLabel = capitalize(r.difficulty);
  let authorNickname: string | null = null;
  if (r.created_by) {
    const { data: nickRow } = await supabase
      .from('public_user_profile')
      .select('nickname')
      .eq('user_id', r.created_by)
      .maybeSingle();
    authorNickname = ((nickRow as any)?.nickname as string | null) ?? null;
  }
  const author = authorNickname || r.creator_name || r.creator_email || 'Unbekannt';

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

  // Prepare minimal ingredient groups for client scaler component
  const initialIngredientGroups = grouped.map((g) => ({
    name: g.name,
    items: g.items.map((i) => ({
      id: i.id,
      quantity: i.quantity,
      unit_name: i.unit_name,
      unit_short_name: i.unit_short_name,
      ingredient_display_name: i.ingredient_display_name,
    })),
  }));

  // Fetch rating summary server-side and whether user has rated (for gating UI)
  const { data: ratingRows } = await supabase
    .from('recipe_ratings')
    .select('rating')
    .eq('recipe_id', id)
    .eq('is_deleted', false);
  const ratings = (ratingRows || []).map((row: any) => row.rating as number);
  const ratingCount = ratings.length;
  const ratingAverage = ratingCount > 0 ? ratings.reduce((a, b) => a + b, 0) / ratingCount : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Admin check
  let isAdmin = false;
  try {
    const { data: rpcVal } = await supabase.rpc('current_user_is_admin');
    isAdmin = Boolean(rpcVal);
  } catch {}
  let userHasRated = false;
  let inCookbook = false;
  if (user) {
    const { data: myRating } = await supabase
      .from('recipe_ratings')
      .select('id')
      .eq('recipe_id', id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .maybeSingle();
    userHasRated = Boolean(myRating);
    const { data: cbRow } = await supabase
      .from('user_cookbook_recipes')
      .select('id')
      .eq('recipe_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    inCookbook = Boolean(cbRow);
  }

  const { default: RecipeRatingSummary } = await import('@/components/RecipeRatingSummary');
  const { default: RateRecipeButton } = await import('@/components/RateRecipeButton');
  const { default: CookbookToggleButton } = await import('@/components/CookbookToggleButton');
  const { default: CommentsSection } = await import('@/components/CommentsSection');
  const commentsPage = Math.max(1, Number((q?.commentsPage as string) || '1') || 1);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const pagePath = `/rezepte/${id}/${slug}`;
  const absoluteUrl = `${siteUrl}${pagePath}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {search?.success && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-green-800 text-sm">
            {search.success === 'created' ? 'Rezept wurde erfolgreich erstellt.' : search.success === 'updated' ? 'Rezept wurde erfolgreich gespeichert.' : 'Aktion erfolgreich.'}
          </div>
        </div>
      )}
      {/* Structured Data for Google (Recipe JSON-LD) */}
      <Script id="recipe-ld-json" type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify((() => {
            const toIsoDuration = (mins: number | null) => (mins && mins > 0 ? `PT${mins}M` : undefined);
            const ensureAbsolute = (u: string) => (u.startsWith('http://') || u.startsWith('https://') ? u : `${siteUrl}${u.startsWith('/') ? '' : '/'}${u}`);
            const image = r.image_url ? [ensureAbsolute(r.image_url)] : undefined;
            const recipeIngredient = ingRows.map((i) => {
              const quantity = i.quantity;
              const unit = i.unit_short_name || i.unit_name || '';
              return `${quantity}${unit ? ` ${unit}` : ''} ${i.ingredient_display_name}`.trim();
            });
            const recipeInstructions = stepRows.map((s) => ({
              '@type': 'HowToStep',
              text: s.instruction,
            }));
            const aggregateRating = ratingAverage && ratingCount
              ? {
                  '@type': 'AggregateRating',
                  ratingValue: Number(ratingAverage.toFixed(2)),
                  ratingCount: ratingCount,
                  bestRating: 5,
                  worstRating: 1,
                }
              : undefined;
            return {
              '@context': 'https://schema.org',
              '@type': 'Recipe',
              mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': absoluteUrl,
              },
              url: absoluteUrl,
              name: r.name,
              description: r.description || undefined,
              image,
              author: r.created_by || r.creator_name || r.creator_email ? {
                '@type': 'Person',
                name: (r.created_by && authorNickname) || r.creator_name || r.creator_email || 'Unbekannt',
              } : undefined,
              datePublished: r.created_at,
              // recipeCategory omitted due to many-to-many categories
              recipeYield: r.portions ? `${r.portions} Portionen` : undefined,
              prepTime: toIsoDuration(r.working_time_minutes),
              cookTime: toIsoDuration(r.cooking_time_minutes),
              totalTime: toIsoDuration((r.working_time_minutes ?? 0) + (r.cooking_time_minutes ?? 0) + (r.resting_time_minutes ?? 0)),
              recipeIngredient,
              recipeInstructions,
              aggregateRating,
            };
          })()),
        }}
      />
      <section className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{r.name}</h1>
              {r.description && <p className="text-gray-600 mb-4">{r.description}</p>}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 items-center">
                <span>
                  👤 {r.created_by && authorNickname ? (
                    <Link href={`/user/${r.created_by}`} className="text-orange-700 hover:underline">{authorNickname}</Link>
                  ) : (
                    author
                  )}
                </span>
                {/* Kategorien-Label entfernt (Many-to-Many) */}
                {/* Portionenanzeige entfernt, stattdessen unten Skala */}
                <span>📊 {difficultyLabel}</span>
                {totalTime && <span>⏱️ {totalTime}</span>}
                <span>
                  <RecipeRatingSummary average={ratingAverage} count={ratingCount} />
                </span>
              </div>
              {isAdmin && (
                <div className="mt-3">
                  <AdminRecipeActions recipeId={id} editHref={`/rezepte/${id}/${slugify(r.name)}/bearbeiten`} />
                </div>
              )}
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
              <div className="mt-4 space-y-2">
                {user ? (
                  userHasRated ? (
                    <div className="text-sm text-gray-600">Danke für deine Bewertung!</div>
                  ) : (
                    <RateRecipeButton recipeId={id} />
                  )
                ) : (
                  <Link href={`/login?redirect=${encodeURIComponent(`/rezepte/${id}/${slug}`)}`} className="text-sm text-orange-600 hover:underline">Jetzt anmelden um zu bewerten</Link>
                )}
                <div>
                  {user ? (
                    <CookbookToggleButton recipeId={id} initialInCookbook={inCookbook} />
                  ) : (
                    <Link href={`/login?redirect=${encodeURIComponent(`/rezepte/${id}/${slug}`)}`} className="text-sm text-orange-600 hover:underline">Zum Kochbuch hinzufügen (Anmeldung erforderlich)</Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Zutaten</h2>
            <IngredientsWithPortionScaler initialPortions={r.portions} initialGroups={initialIngredientGroups} />
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
          <div className="md:col-span-2">
            {user && !isAdmin && (
              <div className="mb-4">
                <div className="flex justify-end">
                  <ReportRecipeDialog recipeId={id} />
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-center">
              <ShareButton title={r.name} text={r.description || r.name} label="Rezept teilen" />
            </div>
            <div className="mt-8">
              <CommentsSection recipeId={id} currentUserId={user ? user.id : null} slug={slug} page={commentsPage} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

