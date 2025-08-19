import type { MetadataRoute } from 'next';
import { createClient } from '@/utils/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const supabase = await createClient();
  const { data } = await supabase
    .from('recipes_with_details')
    .select('id, name, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5000);

  const toSlug = (input: string) =>
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

  const recipeEntries: MetadataRoute.Sitemap = (data || []).map((r: any) => ({
    url: `${siteUrl}/rezepte/${r.id}/${toSlug(r.name)}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/alle-rezepte`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ];

  return [...staticEntries, ...recipeEntries];
}

