import { createClient } from '@/utils/supabase/server';

export async function GET(_: Request, { params }: { params: { page: string } }): Promise<Response> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const supabase = await createClient();
  const PAGE_SIZE = 10000;
  const pageNum = Math.max(1, parseInt(params.page || '1'));
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data } = await supabase
    .from('forum_threads')
    .select('id, updated_at, last_posted_at, is_deleted')
    .eq('is_deleted', false)
    .order('last_posted_at', { ascending: false, nullsFirst: true })
    .order('updated_at', { ascending: false, nullsFirst: true })
    .range(from, to);

  const items = (data || []).map((t: any) => {
    const lastMod = t.last_posted_at || t.updated_at;
    return `<url><loc>${siteUrl}/forum/t/${t.id}</loc>${lastMod ? `<lastmod>${new Date(lastMod).toISOString()}</lastmod>` : ''}</url>`;
  }).join('');

  const xml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">${items}</urlset>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=UTF-8' } });
}


