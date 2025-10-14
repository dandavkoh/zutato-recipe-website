import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import RecipeRatingSummary from '@/components/RecipeRatingSummary';
import RecipeCarousel from '@/components/RecipeCarousel';
import EzoicAd from '@/components/EzoicAd';
import PageViewTracker from '@/components/PageViewTracker';

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
    .from('recipes')
    .select('id, name, description, difficulty, working_time_minutes, cooking_time_minutes, resting_time_minutes, image_url, created_at, created_by')
    .eq('is_draft', false)
    .gte('created_at', weekAgoIso)
    .order('created_at', { ascending: false })
    .limit(300);
  const recent: RecipeRow[] = (recentRows as RecipeRow[] | null) || [];

  const ids = recent.map((r) => r.id);
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

  const top10 = [...recent]
    .sort((a, b) => {
      const ra = avgById[a.id] || { avg: 0, count: 0 };
      const rb = avgById[b.id] || { avg: 0, count: 0 };
      if (rb.avg !== ra.avg) return rb.avg - ra.avg;
      if (rb.count !== ra.count) return rb.count - ra.count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 10);

  // Fetch latest 3 published blog posts
  type PublicPost = {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    cover_image_url: string;
    published_at: string | null;
    reading_time_minutes: number | null;
  };
  const { data: latestBlogRows } = await supabase
    .from('public_blog_posts')
    .select('id, slug, title, excerpt, cover_image_url, published_at, reading_time_minutes')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(3);
  const latestPosts: PublicPost[] = (latestBlogRows as PublicPost[] | null) || [];

  return (
    <div className="min-h-screen">
      <PageViewTracker event="page_view" contentType="page" metadata={{ page: 'root' }} />
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

      {/* High-visibility, non-intrusive ad below hero */}
      {/* <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <EzoicAd className="my-2" />
        </div>
      </div> */}

      {/* Featured Categories */}
      {/* <section className="py-16 bg-white">
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
      </section> */}

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
          <RecipeCarousel recipes={top10} ratingById={avgById} />
        </div>
      </section>

      {/* Latest Blog Posts */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Aktuelle Blogartikel</h2>
            <Link href="/blog" className="text-orange-600 hover:text-orange-700 font-semibold transition-colors">Alle Blogartikel →</Link>
          </div>
          {latestPosts.length === 0 ? (
            <div className="text-center text-gray-600">Noch keine Blogartikel vorhanden.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestPosts.map((p) => (
                <Link key={p.id} href={`/blog/${p.slug}`} className="group block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-40 bg-gray-100 flex items-center justify-center">
                    {p.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl">📝</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-700">{p.title}</h3>
                    {p.excerpt && <p className="text-sm text-gray-600 line-clamp-2 mt-1">{p.excerpt}</p>}
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-600">
                      {p.published_at && <span>{new Date(p.published_at).toLocaleDateString('de-DE')}</span>}
                      {typeof p.reading_time_minutes === 'number' && <span>⏱️ {p.reading_time_minutes} Min</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
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
            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
            </div> */}
          </div>
        </div>
      </section>
    </div>
  );
}
