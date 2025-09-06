import { createClient } from '@/utils/supabase/server';

export async function GET(_: Request, { params }: { params: { page: string } }): Promise<Response> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const supabase = await createClient();
  const PAGE_SIZE = 10000;
  const pageNum = Math.max(1, parseInt(params.page || '1'));
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data } = await supabase
    .from('public_blog_posts')
    .select('slug, updated_at, published_at')
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(from, to);

  const items = (data || []).map((p: any) =>
    `<url><loc>${siteUrl}/blog/${p.slug}</loc><lastmod>${new Date(p.updated_at || p.published_at || Date.now()).toISOString()}</lastmod></url>`
  ).join('');

  const xml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">${items}</urlset>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=UTF-8' } });
}


