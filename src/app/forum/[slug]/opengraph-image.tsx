import { ImageResponse } from 'next/og';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const alt = 'Forum Bereich';
export const size = { width: 1200, height: 630 };

type RouteParams = { slug: string };

export default async function OpengraphImage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('forum_sections')
    .select('title, description')
    .eq('slug', slug)
    .maybeSingle();
  const row: any = data;
  const title = row?.title || slug;
  const desc = row?.description ? String(row.description).slice(0, 120) : '';
  const lines = ['ZUTATO', title, ...(desc ? [desc] : [])];

  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
        }}
      >
        <div
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: 44,
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
    { ...size }
  );
}

