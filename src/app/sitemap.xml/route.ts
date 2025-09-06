import { createClient } from '@/utils/supabase/server';

export async function GET(): Promise<Response> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const supabase = await createClient();
  const PAGE_SIZE = 10000;

  const [
    { count: recipesCount },
    { count: blogCount },
    { count: forumSectionsCount },
    { count: forumThreadsCount },
  ] = await Promise.all([
    supabase.from('recipes_with_details').select('id', { count: 'exact', head: true }),
    supabase.from('public_blog_posts').select('id', { count: 'exact', head: true }),
    supabase.from('forum_sections').select('id', { count: 'exact', head: true }),
    supabase.from('forum_threads').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
  ]);

  const recipePages = Math.max(1, Math.ceil((recipesCount || 0) / PAGE_SIZE));
  const blogPages = Math.max(1, Math.ceil((blogCount || 0) / PAGE_SIZE));
  const forumSectionPages = Math.max(1, Math.ceil((forumSectionsCount || 0) / PAGE_SIZE));
  const forumThreadPages = Math.max(1, Math.ceil((forumThreadsCount || 0) / PAGE_SIZE));

  const urls: string[] = [
    `${siteUrl}/sitemaps/static`,
    ...Array.from({ length: recipePages }, (_, i) => `${siteUrl}/sitemaps/recipes/${i + 1}`),
    ...Array.from({ length: blogPages },   (_, i) => `${siteUrl}/sitemaps/blog/${i + 1}`),
    ...Array.from({ length: forumSectionPages }, (_, i) => `${siteUrl}/sitemaps/forum/sections/${i + 1}`),
    ...Array.from({ length: forumThreadPages },  (_, i) => `${siteUrl}/sitemaps/forum/threads/${i + 1}`),
  ];

  const body = urls.map((u) => `<sitemap><loc>${u}</loc></sitemap>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=UTF-8' } });
}


