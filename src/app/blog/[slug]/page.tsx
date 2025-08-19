import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import type { Metadata } from 'next';
import Script from 'next/script';
import ShareButton from '@/components/ShareButton';
import AdminBlogPostActions from '@/components/AdminBlogPostActions';

type RouteParams = { slug: string };

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('title, meta_title, meta_description, status, published_at, is_deleted, cover_image_url')
    .eq('slug', slug)
    .maybeSingle();
  const row: any = data;
  if (!row) return { title: 'Blog', description: 'Artikel' };
  const title = row.meta_title || row.title || 'Blog';
  const description = row.meta_description || 'Artikel';
  const imageUrl: string | null = row.cover_image_url || null;
  const url = `/blog/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      images: [
        { url: `${url}/opengraph-image`, width: 1200, height: 630, alt: title },
        ...(imageUrl ? [{ url: imageUrl, alt: title }] : []),
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${url}/opengraph-image`, ...(imageUrl ? [imageUrl] : [])],
      creator: '@zutato',
    },
  };
}

export default async function BlogPostPage({ params, searchParams }: { params: Promise<RouteParams>; searchParams?: Promise<{ commentsPage?: string }> }) {
  const { slug } = await params;
  const q = searchParams ? await searchParams : undefined;
  const supabase = await createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('id, title, content, cover_image_url, published_at, reading_time_minutes, status, is_deleted')
    .eq('slug', slug)
    .maybeSingle();
  const post: any = data;

  if (!post || post.is_deleted || post.status !== 'published' || (post.published_at && new Date(post.published_at) > new Date())) {
    notFound();
  }

  const { data: auth } = await supabase.auth.getUser();
  const currentUserId = auth?.user?.id ?? null;
  // Admin check
  let isAdmin = false;
  try {
    const { data: rpcVal } = await supabase.rpc('current_user_is_admin');
    isAdmin = Boolean(rpcVal);
  } catch {}
  const { default: BlogCommentsSection } = await import('@/components/BlogCommentsSection');
  const commentsPage = Math.max(1, Number((q?.commentsPage as string) || '1') || 1);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const absoluteUrl = `${siteUrl}/blog/${slug}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Script id="article-ld-json" type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl },
            headline: post.title,
            image: post.cover_image_url ? [post.cover_image_url] : undefined,
            datePublished: post.published_at || undefined,
            dateModified: post.published_at || undefined,
            author: undefined,
            publisher: { '@type': 'Organization', name: 'ZUTATO' },
            description: (post.meta_description || post.title) || undefined,
          }),
        }}
      />
      <section className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">{post.title}</h1>
          <div className="mt-2 text-gray-600 text-sm flex gap-4 items-center flex-wrap">
            {post.published_at && <span>{new Date(post.published_at).toLocaleDateString('de-DE')}</span>}
            {typeof post.reading_time_minutes === 'number' && <span>⏱️ {post.reading_time_minutes} Min</span>}
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {post.cover_image_url && (
            <div className="mb-6 h-64 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}
          <article className="prose prose-orange max-w-none">
            <div className="whitespace-pre-wrap text-gray-900 leading-7">{post.content}</div>
          </article>
          <div className="mt-6 flex justify-center">
            <ShareButton title={post.title} text={post.meta_description || post.title} label="Artikel teilen" />
          </div>
          {isAdmin && (
            <div className="mt-4">
              <AdminBlogPostActions postId={post.id} />
            </div>
          )}
          <div className="mt-10">
            <BlogCommentsSection postId={post.id} slug={slug} currentUserId={currentUserId} page={commentsPage} />
          </div>
        </div>
      </section>
    </div>
  );
}

