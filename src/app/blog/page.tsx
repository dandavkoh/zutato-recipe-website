import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import type { Metadata } from 'next';
import PageViewTracker from '@/components/PageViewTracker';

type PublicPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string;
  published_at: string | null;
  reading_time_minutes: number | null;
};

export const metadata: Metadata = {
  title: 'Blog – ZUTATO',
  description: 'Neueste Artikel aus unserem Blog: Neuigkeiten, Guides und Inspiration.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog – ZUTATO',
    description: 'Neuigkeiten, Guides und Inspiration.',
    url: '/blog',
    images: [
      { url: '/blog/opengraph-image', width: 1200, height: 630, alt: 'ZUTATO Blog' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog – ZUTATO',
    description: 'Neuigkeiten, Guides und Inspiration.',
    images: ['/blog/opengraph-image'],
    creator: '@zutato',
  },
};

export default async function BlogListPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const supabase = await createClient();

  const q = await searchParams;
  const pageSize = 25;
  const pageNum = Math.max(1, parseInt(q?.page || '1'));
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from('public_blog_posts')
    .select('id, slug, title, excerpt, cover_image_url, published_at, reading_time_minutes', { count: 'exact' })
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(from, to);
  const posts: PublicPost[] = (data as PublicPost[]) || [];
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen bg-gray-50">
      <PageViewTracker event="blog_view" contentType="blog" />
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
          <p className="text-gray-600 mt-2">Neuigkeiten, Guides und Inspiration</p>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {posts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-600">
              Noch keine Blogartikel vorhanden.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((p) => (
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
          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-10">
            {pageNum > 1 && (
              <Link href={`/blog?page=${pageNum - 1}`} className="bg-white hover:bg-gray-50 text-orange-600 border-2 border-orange-600 px-6 py-2 rounded-full font-medium transition-colors">Zurück</Link>
            )}
            {pageNum < totalPages && (
              <Link href={`/blog?page=${pageNum + 1}`} className="bg-white hover:bg-gray-50 text-orange-600 border-2 border-orange-600 px-6 py-2 rounded-full font-medium transition-colors">Weitere Artikel laden</Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

