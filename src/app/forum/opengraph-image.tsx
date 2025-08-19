import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'ZUTATO Forum';
export const size = { width: 1200, height: 630 };

export default async function OpengraphImage() {
  const lines = [
    'ZUTATO',
    'Forum',
    'Diskussionen, Tipps und Hilfe',
  ];
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

