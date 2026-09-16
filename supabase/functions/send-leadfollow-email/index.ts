declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('EMAIL_FROM') ?? 'no-reply@summeca.com';
const SITE_URL = (Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? 'https://summeca.com').replace(/\/$/, '');

function constantTimeEqual(left: string, right: string): boolean {
  if (!left || !right || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function isAuthorized(req: Request): boolean {
  const authorization = req.headers.get('Authorization') ?? '';
  const bearerToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  return Boolean(SERVICE_ROLE_KEY) && constantTimeEqual(bearerToken, SERVICE_ROLE_KEY);
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function renderBody(body: string, businessName: string, replyTo: string): string {
  const paragraphs = body
    .replace(/\u0000/g, '')
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px;line-height:1.7;color:#334155;font-size:15px">${esc(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#334155">
  <div style="max-width:620px;margin:0 auto;padding:28px 16px 44px">
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
      <div style="height:4px;background:#0d9488"></div>
      <div style="padding:32px">${paragraphs}</div>
      <div style="padding:18px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;color:#94a3b8;font-size:11px;line-height:1.6;text-align:center">
        Sent by ${esc(businessName)} using <a href="${esc(SITE_URL)}" style="color:#0d9488;text-decoration:none">SUMMECA LeadFollow AI</a>.<br>
        Replies are directed to ${esc(replyTo)}. If you do not want further follow-ups, reply and ask the sender to stop.
      </div>
    </div>
  </div>
</body>
</html>`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!isAuthorized(req)) return json({ error: 'Unauthorized' }, 401);
  if (!RESEND_API_KEY) return json({ error: 'Email service not configured' }, 503);

  let body: {
    deliveryId?: string;
    to?: string;
    subject?: string;
    body?: string;
    businessName?: string;
    replyTo?: string;
    attempt?: number;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const deliveryId = typeof body.deliveryId === 'string' ? body.deliveryId.trim() : '';
  const to = typeof body.to === 'string' ? body.to.trim().toLowerCase() : '';
  const subject = typeof body.subject === 'string' ? body.subject.replace(/[\r\n]+/g, ' ').trim() : '';
  const messageBody = typeof body.body === 'string' ? body.body.trim() : '';
  const businessName = typeof body.businessName === 'string' ? body.businessName.trim().slice(0, 160) : '';
  const replyTo = typeof body.replyTo === 'string' ? body.replyTo.trim().toLowerCase() : '';
  const attempt = Number.isInteger(body.attempt) && Number(body.attempt) > 0 ? Number(body.attempt) : 1;

  if (!/^[0-9a-f-]{36}$/i.test(deliveryId)) return json({ error: 'Invalid delivery id' }, 400);
  if (!validEmail(to) || !validEmail(replyTo)) return json({ error: 'Invalid email address' }, 400);
  if (!subject || subject.length > 180) return json({ error: 'Invalid subject' }, 400);
  if (!messageBody || messageBody.length > 8_000) return json({ error: 'Invalid email body' }, 400);
  if (!businessName) return json({ error: 'Business name is required' }, 400);

  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `summeca-leadfollow-${deliveryId}-${attempt}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        reply_to: replyTo,
        subject,
        html: renderBody(messageBody, businessName, replyTo),
        text: messageBody,
      }),
    });
  } catch {
    return json({ error: 'Email provider could not be reached' }, 502);
  }

  let provider: { id?: unknown; message?: unknown } = {};
  try {
    provider = await response.json();
  } catch {
    provider = {};
  }

  if (!response.ok) {
    return json({
      error: 'Email provider rejected the message',
      providerStatus: response.status,
    }, 502);
  }

  const providerMessageId = typeof provider.id === 'string' ? provider.id : '';
  return json({ success: true, providerMessageId });
});
