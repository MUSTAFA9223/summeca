import { ImageResponse } from 'next/og';

export const alt = 'SUMMECA — AI, SaaS and digital tools for modern work';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#071014',
          color: '#f8fafc',
          padding: '72px 80px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              border: '2px solid #22d3c5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: '-2px',
              color: '#22d3c5',
            }}
          >
            SM
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 2 }}>SUMMECA</div>
            <div style={{ marginTop: 6, fontSize: 18, color: '#8ea4aa' }}>Digital tools for modern work</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 920 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 66,
              lineHeight: 1.06,
              fontWeight: 800,
              letterSpacing: '-2.5px',
            }}
          >
            AI, SaaS & digital tools for faster business.
          </div>
          <div style={{ marginTop: 28, display: 'flex', fontSize: 27, lineHeight: 1.35, color: '#b6c7cb' }}>
            Practical software and digital products built to help small teams work faster and stay organized.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {['InvoiceFlow', 'LeadFollow AI', 'Digital Products'].map((label) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  padding: '10px 18px',
                  borderRadius: 999,
                  background: '#0e2025',
                  border: '1px solid #1d3d43',
                  fontSize: 17,
                  color: '#d9f7f3',
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, color: '#22d3c5' }}>summeca.com</div>
        </div>
      </div>
    ),
    size,
  );
}
