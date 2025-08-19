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
  const bg = recipe?.image_url || '';
  const totalMinutes = (recipe?.working_time_minutes ?? 0) + (recipe?.cooking_time_minutes ?? 0) + (recipe?.resting_time_minutes ?? 0);
  const duration = totalMinutes > 0 ? `${totalMinutes} Min` : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: 'flex',
          position: 'relative',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
          backgroundColor: '#0f172a',
          color: '#ffffff',
        }}
      >
        {bg ? (
          <img
            src={bg}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.55) blur(0px)' }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(120deg, rgba(2,6,23,0.85), rgba(2,6,23,0.35))',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 48, width: '100%', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fb923c' }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>ZUTATO</div>
            <div style={{ fontSize: 16, opacity: 0.9 }}>Rezepte</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
            {desc ? <div style={{ fontSize: 22, opacity: 0.9 }}>{desc}</div> : null}
            <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 22 }}>
              {recipe?.category_name ? <div>🏷️ {recipe.category_name}</div> : null}
              {duration ? <div>⏱️ {duration}</div> : null}
              {ratingAverage != null ? (
                <div>⭐ {ratingAverage.toFixed(1)}{ratingCount > 0 ? ` (${ratingCount})` : ''}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

