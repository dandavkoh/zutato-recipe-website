import { createClient } from '@/utils/supabase/server';

export async function GET(_: Request, { params }: { params: { page: string } }): Promise<Response> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const supabase = await createClient();
  const PAGE_SIZE = 10000;
  const pageNum = Math.max(1, parseInt(params.page || '1'));
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data } = await supabase
    .from('forum_sections')
    .select('slug, updated_at')
    .order('updated_at', { ascending: false, nullsFirst: true })
    .range(from, to);

  const items = (data || []).map((s: any) =>
    `<url><loc>${siteUrl}/forum/${s.slug}</loc>${s.updated_at ? `<lastmod>${new Date(s.updated_at).toISOString()}</lastmod>` : ''}</url>`
  ).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=UTF-8' } });
}


