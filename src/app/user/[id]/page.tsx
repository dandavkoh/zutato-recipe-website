import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import RecipeRatingSummary from '@/components/RecipeRatingSummary';
import FontAwesomeIcon from '@/components/FontAwesomeIcon';
import SendMessageDialog from '@/components/inbox/SendMessageDialog';
import ReportUserDialog from '@/components/ReportUserDialog';

type RouteParams = { id: string };

export const metadata = {
  title: 'Öffentliches Profil',
};

export default async function PublicProfilePage({ params }: { params: Promise<RouteParams> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('public_user_profile')
    .select('nickname, banner, avatar_url, social_links')
    .eq('user_id', id)
    .maybeSingle();

  const nickname = (profile as any)?.nickname as string | null;
  const banner = (profile as any)?.banner as string | null;
  const avatarUrl = (profile as any)?.avatar_url as string | null;
  const social = (profile as any)?.social_links as Record<string, string | null> | null;

  const { data: recipes } = await supabase
    .from('recipes_with_details')
    .select(
      'id, name, description, difficulty, working_time_minutes, cooking_time_minutes, resting_time_minutes, image_url, created_at, category_name, created_by'
    )
    .eq('created_by', id)
    .order('created_at', { ascending: false });

  // calc rating summary for recipes
  const recipeList = (recipes as any[]) || [];
  const recipeIds = recipeList.map((r) => r.id);
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

  const toSlug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

  type Platform = 'instagram' | 'tiktok' | 'facebook' | 'x' | 'pinterest' | 'youtube';
  const normalizeSocialLink = (platform: Platform, value: string): string => {
    const input = (value || '').trim();
    if (!input) return '#';
    // If already absolute (http/https), return as-is
    if (/^https?:\/\//i.test(input)) return input;
    // If starts with @handle, build platform-specific URL
    if (input.startsWith('@')) {
      const handle = input.slice(1);
      switch (platform) {
        case 'instagram':
          return `https://www.instagram.com/${handle}`;
        case 'tiktok':
          return `https://www.tiktok.com/@${handle}`;
        case 'facebook':
          return `https://www.facebook.com/${handle}`;
        case 'x':
          return `https://x.com/${handle}`;
        case 'pinterest':
          return `https://www.pinterest.com/${handle}/`;
        case 'youtube':
          return `https://www.youtube.com/@${handle}`;
      }
    }
    // If looks like a domain/path, prefix https://
    if (input.startsWith('www.') || input.includes('.')) {
      return `https://${input.replace(/^\/+/, '')}`;
    }
    // Fallback: treat as username for the platform
    switch (platform) {
      case 'instagram':
        return `https://www.instagram.com/${input}`;
      case 'tiktok':
        return `https://www.tiktok.com/@${input}`;
      case 'facebook':
        return `https://www.facebook.com/${input}`;
      case 'x':
        return `https://x.com/${input}`;
      case 'pinterest':
        return `https://www.pinterest.com/${input}/`;
      case 'youtube':
        return `https://www.youtube.com/@${input}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-gray-100 overflow-hidden border">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={nickname || 'Avatar'} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-400 text-3xl">👤</div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{nickname || 'Unbekannter Nutzer'}</h1>
              {banner && <p className="text-gray-600 mt-1">{banner}</p>}
              {social && (
                <div className="flex items-center gap-3 mt-2 text-gray-700">
                  {social.instagram && (
                    <a href={normalizeSocialLink('instagram', social.instagram)} target="_blank" rel="nofollow noopener noreferrer" className="hover:text-orange-600" aria-label="Instagram">
                      <FontAwesomeIcon icon="instagram" style="brands" />
                    </a>
                  )}
                  {social.tiktok && (
                    <a href={normalizeSocialLink('tiktok', social.tiktok)} target="_blank" rel="nofollow noopener noreferrer" className="hover:text-orange-600" aria-label="TikTok">
                      <FontAwesomeIcon icon="tiktok" style="brands" />
                    </a>
                  )}
                  {social.facebook && (
                    <a href={normalizeSocialLink('facebook', social.facebook)} target="_blank" rel="nofollow noopener noreferrer" className="hover:text-orange-600" aria-label="Facebook">
                      <FontAwesomeIcon icon="facebook" style="brands" />
                    </a>
                  )}
                  {social.x && (
                    <a href={normalizeSocialLink('x', social.x)} target="_blank" rel="nofollow noopener noreferrer" className="hover:text-orange-600" aria-label="X">
                      <FontAwesomeIcon icon="x-twitter" style="brands" />
                    </a>
                  )}
                  {social.pinterest && (
                    <a href={normalizeSocialLink('pinterest', social.pinterest)} target="_blank" rel="nofollow noopener noreferrer" className="hover:text-orange-600" aria-label="Pinterest">
                      <FontAwesomeIcon icon="pinterest" style="brands" />
                    </a>
                  )}
                  {social.youtube && (
                    <a href={normalizeSocialLink('youtube', social.youtube)} target="_blank" rel="nofollow noopener noreferrer" className="hover:text-orange-600" aria-label="YouTube">
                      <FontAwesomeIcon icon="youtube" style="brands" />
                    </a>
                  )}
                </div>
              )}
              {auth?.user && auth.user.id !== id && (
                <div className="mt-3 flex items-center gap-4">
                  <SendMessageDialog recipientId={id} recipientName={nickname || 'Nutzer'} />
                  <div className="ml-auto">
                    <ReportUserDialog userId={id} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Rezepte von {nickname || 'diesem Nutzer'}</h2>
          {recipeList.length === 0 ? (
            <div className="text-gray-600">Keine Rezepte vorhanden.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {recipeList.map((recipe) => {
                const w = recipe.working_time_minutes ?? 0;
                const c = recipe.cooking_time_minutes ?? 0;
                const r = recipe.resting_time_minutes ?? 0;
                const tm = w + c + r;
                const timeText = tm > 0 ? `${tm} Min` : '–';
                const difficultyText = (recipe.difficulty as string).charAt(0).toUpperCase() + (recipe.difficulty as string).slice(1);
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
                        <span>📊 {difficultyText}</span>
                        <span>
                          <RecipeRatingSummary
                            average={ratingSummaryById[recipe.id]?.average ?? null}
                            count={ratingSummaryById[recipe.id]?.count ?? 0}
                          />
                        </span>
                      </div>
                      <Link href={`/rezepte/${recipe.id}/${toSlug(recipe.name)}`} className="block w-full bg-orange-600 hover:bg-orange-700 text-white text-center py-2 rounded-lg font-medium transition-colors">
                        Rezept anzeigen
                      </Link>
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

