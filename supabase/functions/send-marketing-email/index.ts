declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SITE_URL = (Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? 'https://summeca.com').replace(/\/$/, '');
const FROM_EMAIL = Deno.env.get('EMAIL_FROM') ?? 'no-reply@summeca.com';
const MAX_RECIPIENTS = 500;
const BATCH_SIZE = 100;

type Recipient = {
  userId: string;
  email: string;
  name?: string | null;
};

type BatchResult = {
  userIds: string[];
  success: boolean;
  providerStatus: number;
};

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

function toPlainText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\u0000/g, '')
    .trim();
}

function renderCampaign(name: string | null | undefined, subject: string, content: string): string {
  const safeName = esc((name ?? '').trim() || 'there');
  const safeSubject = esc(subject);
  const body = toPlainText(content)
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px;line-height:1.7;color:#374151;font-size:15px">${esc(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
  const settingsUrl = `${SITE_URL}/user-dashboard/settings`;

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeSubject}</title></head>
<body style="margin:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#374151">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px 48px">
    <div style="text-align:center;padding-bottom:22px;font-size:26px;font-weight:800;color:#0d9488">SUMMECA<span style="color:#134e4a">.</span></div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
      <div style="height:4px;background:#14b8a6"></div>
      <div style="padding:36px 36px 28px">
        <h1 style="margin:0 0 18px;font-size:22px;line-height:1.35;color:#111827">${safeSubject}</h1>
        <p style="margin:0 0 18px;line-height:1.7;color:#374151;font-size:15px">Hi ${safeName},</p>
        ${body}
        <div style="margin-top:28px"><a href="${esc(SITE_URL)}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700">Visit SUMMECA</a></div>
      </div>
      <div style="padding:22px 36px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center">
        <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6">You are receiving this marketing email because you opted in to marketing emails from SUMMECA.<br><a href="${esc(settingsUrl)}" style="color:#0d9488">Manage email preferences</a></p>
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
    campaignId?: string;
    subject?: string;
    content?: string;
    recipients?: Recipient[];
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.replace(/[\r\n]+/g, ' ').trim() : '';
  const content = typeof body.content === 'string' ? body.content : '';
  const recipients = Array.isArray(body.recipients) ? body.recipients : [];

  if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return json({ error: 'Invalid campaign id' }, 400);
  if (!subject || subject.length > 200) return json({ error: 'Invalid subject' }, 400);
  if (!content.trim() || content.length > 50_000) return json({ error: 'Invalid content' }, 400);
  if (recipients.length < 1 || recipients.length > MAX_RECIPIENTS) {
    return json({ error: `Recipients must contain 1-${MAX_RECIPIENTS} entries` }, 400);
  }

  const seenEmails = new Set<string>();
  const safeRecipients: Recipient[] = [];
  for (const item of recipients) {
    const userId = typeof item?.userId === 'string' ? item.userId.trim() : '';
    const email = typeof item?.email === 'string' ? item.email.trim().toLowerCase() : '';
    const name = typeof item?.name === 'string' ? item.name.slice(0, 120) : null;
    if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Invalid recipient entry' }, 400);
    }
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);
    safeRecipients.push({ userId, email, name });
  }

  const results: BatchResult[] = [];
  for (let offset = 0; offset < safeRecipients.length; offset += BATCH_SIZE) {
    const batch = safeRecipients.slice(offset, offset + BATCH_SIZE);
    const payload = batch.map((recipient) => ({
      from: FROM_EMAIL,
      to: [recipient.email],
      subject,
      html: renderCampaign(recipient.name, subject, content),
    }));

    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `summeca-marketing-${campaignId}-${offset / BATCH_SIZE}`,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      results.push({
        userIds: batch.map((recipient) => recipient.userId),
        success: false,
        providerStatus: 0,
      });
      continue;
    }

    results.push({
      userIds: batch.map((recipient) => recipient.userId),
      success: response.ok,
      providerStatus: response.status,
    });
  }

  const sent = results.filter((result) => result.success).reduce((sum, result) => sum + result.userIds.length, 0);
  const failed = results.filter((result) => !result.success).reduce((sum, result) => sum + result.userIds.length, 0);

  return json({
    success: failed === 0,
    sent,
    failed,
    results,
  });
});
