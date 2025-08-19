import { ImageResponse } from 'next/og';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

export const alt = 'Rezept Vorschau';
export const size = {
  width: 1200,
  height: 630,
};

type RouteParams = { id: string; slug: string };

export default async function OpengraphImage({ params }: { params: Promise<RouteParams> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: recipe } = await supabase
    .from('recipes_with_details')
    .select('name, description, image_url, working_time_minutes, cooking_time_minutes, resting_time_minutes, category_name')
    .eq('id', id)
    .maybeSingle();

  const { data: ratingRows } = await supabase
    .from('recipe_ratings')
    .select('rating')
    .eq('recipe_id', id)
    .eq('is_deleted', false);

  const ratings = (ratingRows || []).map((row: any) => row.rating as number);
  const ratingCount = ratings.length;
  const ratingAverage = ratingCount > 0 ? ratings.reduce((a, b) => a + b, 0) / ratingCount : null;

  const title = (recipe?.name || 'Rezept').slice(0, 80);
  const desc = (recipe?.description || '').slice(0, 140);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const ensureAbsolute = (u: string) => (u.startsWith('http://') || u.startsWith('https://') ? u : `${siteUrl}${u.startsWith('/') ? '' : '/'}${u}`);
  const bg = recipe?.image_url ? ensureAbsolute(recipe.image_url) : '';
  const totalMinutes = (recipe?.working_time_minutes ?? 0) + (recipe?.cooking_time_minutes ?? 0) + (recipe?.resting_time_minutes ?? 0);
  const duration = totalMinutes > 0 ? `${totalMinutes} Min` : undefined;

  const lines: string[] = [];
  lines.push('ZUTATO');
  lines.push(title);
  const metaParts: string[] = [];
  if (recipe?.category_name) metaParts.push(`🏷️ ${recipe.category_name}`);
  if (duration) metaParts.push(`⏱️ ${duration}`);
  if (ratingAverage != null) metaParts.push(`⭐ ${ratingAverage.toFixed(1)}${ratingCount > 0 ? ` (${ratingCount})` : ''}`);
  if (metaParts.length) lines.push(metaParts.join('   '));
  if (desc) lines.push(desc);

  const containerStyle: Record<string, any> = {
    width: size.width,
    height: size.height,
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  };
  if (bg) {
    containerStyle.backgroundImage = `linear-gradient(120deg, rgba(2,6,23,0.70), rgba(2,6,23,0.35)), url(${bg})`;
    containerStyle.backgroundSize = 'cover';
    containerStyle.backgroundPosition = 'center';
  }

  return new ImageResponse(
    (
      <div style={containerStyle}>
        <div
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: 40,
            lineHeight: 1.3,
            fontWeight: 800,
            width: '100%',
            color: '#ffffff',
            textShadow:
              '0 0 2px rgba(0,0,0,0.95), 0 1px 0 rgba(0,0,0,0.95), 1px 0 0 rgba(0,0,0,0.95), 0 -1px 0 rgba(0,0,0,0.95), -1px 0 0 rgba(0,0,0,0.95), 1px 1px 0 rgba(0,0,0,0.95), -1px 1px 0 rgba(0,0,0,0.95), 1px -1px 0 rgba(0,0,0,0.95), -1px -1px 0 rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.7)',
          }}
        >
          {lines.join('\n')}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

