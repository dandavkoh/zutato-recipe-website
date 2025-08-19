import { ImageResponse } from 'next/og';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const alt = 'Blogartikel';
export const size = { width: 1200, height: 630 };

type RouteParams = { slug: string };

export default async function OpengraphImage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('title, cover_image_url')
    .eq('slug', slug)
    .maybeSingle();
  const post: any = data;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const ensureAbsolute = (u: string) => (u && (u.startsWith('http://') || u.startsWith('https://')) ? u : u ? `${siteUrl}${u.startsWith('/') ? '' : '/'}${u}` : '');
  const bg = post?.cover_image_url ? ensureAbsolute(post.cover_image_url) : '';

  const lines = [
    'ZUTATO',
    post?.title ? String(post.title).slice(0, 100) : 'Blogartikel',
  ];

  const style: Record<string, any> = {
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
    style.backgroundImage = `linear-gradient(120deg, rgba(2,6,23,0.70), rgba(2,6,23,0.35)), url(${bg})`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
  }

  return new ImageResponse(
    (
      <div style={style}>
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

