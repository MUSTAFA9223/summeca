import { ImageResponse } from 'next/og';

const FLAGSHIP_PRODUCTS: Record<string, { title: string; label: string; image: string }> = {
  'summeca-invoiceflow': {
    title: 'InvoiceFlow',
    label: 'Invoicing workspace for small businesses',
    image: '/assets/products/invoiceflow.webp',
  },
  'summeca-leadfollow-ai': {
    title: 'LeadFollow AI',
    label: 'Lead follow-up workspace with AI-assisted drafts',
    image: '/assets/products/leadfollow-ai.webp',
  },
};

function fallbackTitle(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function createProductSocialCard(slug: string) {
  const flagship = FLAGSHIP_PRODUCTS[slug];
  const title = flagship?.title ?? fallbackTitle(slug) ?? 'SUMMECA Product';
  const label = flagship?.label ?? 'Digital tools and practical workflows for modern work';
  const image = flagship?.image ? `https://summeca.com${flagship.image}` : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #04191f 0%, #07313a 58%, #0a6670 100%)',
          color: '#eefcfb',
          padding: '54px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: image ? '45%' : '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: 26, fontWeight: 800 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#20d9bd',
                color: '#03231f',
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              S
            </div>
            SUMMECA
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 58, lineHeight: 1.02, fontWeight: 900, letterSpacing: '-2px' }}>
              {title}
            </div>
            <div style={{ display: 'flex', marginTop: 22, maxWidth: 500, fontSize: 25, lineHeight: 1.35, color: '#bfe2e3' }}>
              {label}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, color: '#72e8d5' }}>
            summeca.com
          </div>
        </div>

        {image ? (
          <div
            style={{
              width: '51%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 30,
              padding: 18,
              background: 'rgba(238, 252, 251, 0.96)',
              boxShadow: '0 26px 60px rgba(0, 0, 0, 0.26)',
              overflow: 'hidden',
            }}
          >
            <img
              src={image}
              alt=""
              width="560"
              height="480"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        ) : null}
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
