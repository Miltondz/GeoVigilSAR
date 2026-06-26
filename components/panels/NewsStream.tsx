'use client'

interface NewsItem {
  title: string
  source: string
  timeStr: string
  url?: string
  lang?: string
}

interface NewsStreamProps {
  items: NewsItem[]
}

export default function NewsStream({ items }: NewsStreamProps) {
  return (
    <div style={{
      borderTop: '1px solid var(--color-slate)',
      flex: 1,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        fontFamily: 'var(--font-hud)',
        fontSize: '0.5rem',
        color: 'var(--color-muted)',
        letterSpacing: '0.15em',
        padding: '0.375rem 0.75rem 0.25rem',
      }}>
        NOTICIAS GDELT
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem 0.5rem' }}>
        {items.map((item, i) => (
          <a
            key={i}
            href={item.url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: '0.375rem 0',
              borderBottom: '1px solid var(--color-slate)',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.625rem',
              color: 'var(--color-text)',
              lineHeight: 1.4,
              marginBottom: '0.125rem',
            }}>
              {item.title}
            </div>
            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-cyan)', letterSpacing: '0.05em' }}>
                {item.source}
              </span>
              <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-muted)' }}>
                {item.timeStr}
              </span>
              {item.lang && (
                <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.4375rem', color: 'var(--color-slate)', letterSpacing: '0.1em', marginLeft: 'auto' }}>
                  [{item.lang.toUpperCase()}]
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
