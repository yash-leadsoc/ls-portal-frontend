const LOGO = '/logo.png?v=2';

const VARIANTS = {
  400: {
    code: '400',
    title: 'Bad request',
    text: 'Something in that link or request was not right. Go back and try again.',
  },
  401: {
    code: '401',
    title: 'Please sign in',
    text: 'Your session has ended. Sign in again to continue.',
  },
  403: {
    code: '403',
    title: 'No access',
    text: 'Your account does not have permission to open this page. Ask your admin if you need access.',
  },
  404: {
    code: '404',
    title: 'Page not found',
    text: 'The page you are looking for does not exist, was moved, or the link is wrong.',
  },
  408: {
    code: '408',
    title: 'Request timed out',
    text: 'The server took too long to respond. Check your connection and try again.',
  },
  429: {
    code: '429',
    title: 'Too many requests',
    text: 'You have made a lot of requests in a short time. Wait a minute and try again.',
  },
  500: {
    code: '500',
    title: 'Something went wrong',
    text: 'An unexpected error happened on this page. Reloading usually fixes it.',
  },
  502: {
    code: '502',
    title: 'Server is restarting',
    text: 'The TEDP server is being updated or restarted. Please try again in a minute.',
  },
  503: {
    code: '503',
    title: 'Back in a minute',
    text: 'The portal is under maintenance or temporarily unavailable. Please try again shortly.',
  },
  504: {
    code: '504',
    title: 'Server took too long',
    text: 'The server did not respond in time. Please try again in a minute.',
  },
  offline: {
    code: '503',
    title: 'Server unavailable',
    text: 'We cannot reach the TEDP server right now. It may be restarting or your internet may be down. Please try again in a minute.',
  },
};

const NAV_CODES = new Set(['400', '401', '403', '404']);

export default function ErrorPage({ code = 404, title, message, detail, onRetry, fullScreen = false }) {
  const v = VARIANTS[code] || VARIANTS[500];
  const goHome = () => window.location.assign('/');
  const goBack = () => (window.history.length > 1 ? window.history.back() : goHome());
  const retry = onRetry || (() => window.location.reload());
  const navigational = NAV_CODES.has(v.code);
  const tone = navigational ? 'var(--cyan, #00a8c8)' : '#e0892a';

  return (
    <div
      style={{
        minHeight: fullScreen ? '100vh' : '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: fullScreen ? 'var(--page-bg, #f3f6fb)' : 'transparent',
      }}
    >
      <div
        style={{
          maxWidth: 560,
          width: '100%',
          background: '#fff',
          border: '1px solid var(--border, #e6eaf2)',
          borderRadius: 18,
          boxShadow: 'var(--shadow, 0 6px 24px rgba(16,26,56,.08))',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 4, background: tone }} />
        <div style={{ padding: '30px 30px 28px', textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: '0 auto',
              borderRadius: 14,
              background: '#fff',
              border: '1px solid var(--border, #e6eaf2)',
              padding: 6,
              boxSizing: 'border-box',
            }}
          >
            <img src={LOGO} alt="LeadSoC" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: 72,
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: 4,
              color: 'var(--navy, #1b2b5e)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {v.code}
          </div>
          <div
            style={{
              display: 'inline-block',
              marginTop: 10,
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              color: tone,
              background: navigational ? 'rgba(0,168,200,.1)' : 'rgba(224,137,42,.12)',
            }}
          >
            {navigational ? 'Page problem' : 'Server problem'}
          </div>

          <h1 style={{ margin: '14px 0 8px', fontSize: 22, color: 'var(--navy, #1b2b5e)' }}>{title || v.title}</h1>
          <p style={{ margin: '0 auto', maxWidth: 420, color: 'var(--muted, #5a6482)', fontSize: 14.5, lineHeight: 1.6 }}>
            {message || v.text}
          </p>

          {detail ? (
            <pre
              style={{
                marginTop: 16,
                textAlign: 'left',
                fontSize: 11.5,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 10,
                maxHeight: 140,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                color: '#475569',
              }}
            >
              {detail}
            </pre>
          ) : null}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
            {v.code === '401' ? (
              <button className="btn cyan" onClick={goHome}>Sign in</button>
            ) : navigational ? (
              <>
                <button className="btn ghost" onClick={goBack}>← Go back</button>
                <button className="btn cyan" onClick={goHome}>Go to dashboard</button>
              </>
            ) : (
              <>
                <button className="btn ghost" onClick={goHome}>Go to dashboard</button>
                <button className="btn cyan" onClick={retry}>↻ Try again</button>
              </>
            )}
          </div>
        </div>
        <div
          style={{
            borderTop: '1px solid var(--border, #e6eaf2)',
            padding: '12px 20px',
            fontSize: 12,
            color: 'var(--muted, #5a6482)',
            textAlign: 'center',
          }}
        >
          LeadSoC TEDP · If this keeps happening, contact your portal admin.
        </div>
      </div>
    </div>
  );
}
