import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const now = new Date();
  const urls: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/alle-rezepte`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
    { url: `${siteUrl}/forum`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${siteUrl}/suche`, lastModified: now, changeFrequency: 'weekly', priority: 0.3 },
    { url: `${siteUrl}/impressum`, lastModified: now, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${siteUrl}/datenschutz`, lastModified: now, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${siteUrl}/agb`, lastModified: now, changeFrequency: 'yearly', priority: 0.1 },
  ];

  const body = urls
    .map((u) => `<url><loc>${u.url}</loc><lastmod>${(u.lastModified as Date).toISOString()}</lastmod></url>`) // minimal
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=UTF-8' } });
}


