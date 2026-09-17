import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

export type LeadFollowMailboxProvider = 'google' | 'microsoft';

const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.send',
];

const MICROSOFT_SCOPES = [
  'offline_access',
  'openid',
  'profile',
  'email',
  'User.Read',
  'Mail.Send',
];

function requiredSecret(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function encryptionKey() {
  return createHash('sha256')
    .update(requiredSecret('EMAIL_OAUTH_ENCRYPTION_KEY'), 'utf8')
    .digest();
}

export function encryptMailboxToken(value: string) {
  if (!value) throw new Error('Cannot encrypt an empty mailbox token.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

export function decryptMailboxToken(value: string) {
  const [version, ivRaw, tagRaw, bodyRaw] = value.split('.');
  if (version !== 'v1' || !ivRaw || !tagRaw || !bodyRaw) throw new Error('Invalid encrypted mailbox token.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(bodyRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function providerClient(provider: LeadFollowMailboxProvider) {
  if (provider === 'google') {
    return {
      clientId: requiredSecret('GMAIL_OAUTH_CLIENT_ID'),
      clientSecret: requiredSecret('GMAIL_OAUTH_CLIENT_SECRET'),
      scopes: GOOGLE_SCOPES,
    };
  }

  return {
    clientId: requiredSecret('MICROSOFT_OAUTH_CLIENT_ID'),
    clientSecret: requiredSecret('MICROSOFT_OAUTH_CLIENT_SECRET'),
    scopes: MICROSOFT_SCOPES,
  };
}

export function mailboxProviderConfigured(provider: LeadFollowMailboxProvider) {
  try {
    requiredSecret('EMAIL_OAUTH_ENCRYPTION_KEY');
    providerClient(provider);
    return true;
  } catch {
    return false;
  }
}

function microsoftTenant() {
  return process.env.MICROSOFT_OAUTH_TENANT_ID?.trim() || 'common';
}

export function mailboxRedirectUri(provider: LeadFollowMailboxProvider, requestOrigin: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || requestOrigin).replace(/\/$/, '');
  return `${base}/api/leadfollow/email-connections/${provider}/callback`;
}

export function mailboxAuthorizeUrl(
  provider: LeadFollowMailboxProvider,
  state: string,
  requestOrigin: string,
) {
  const { clientId, scopes } = providerClient(provider);
  const redirectUri = mailboxRedirectUri(provider, requestOrigin);

  if (provider === 'google') {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scopes.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('include_granted_scopes', 'true');
    return url.toString();
  }

  const url = new URL(`https://login.microsoftonline.com/${encodeURIComponent(microsoftTenant())}/oauth2/v2.0/authorize`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function parseTokenResponse(response: Response) {
  const payload = await response.json().catch(() => ({})) as TokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || 'Mailbox provider token exchange failed.');
  }
  return payload;
}

export async function exchangeMailboxCode(
  provider: LeadFollowMailboxProvider,
  code: string,
  requestOrigin: string,
) {
  const { clientId, clientSecret } = providerClient(provider);
  const redirectUri = mailboxRedirectUri(provider, requestOrigin);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const endpoint = provider === 'google'
    ? 'https://oauth2.googleapis.com/token'
    : `https://login.microsoftonline.com/${encodeURIComponent(microsoftTenant())}/oauth2/v2.0/token`;

  if (provider === 'microsoft') body.set('scope', MICROSOFT_SCOPES.join(' '));
  return parseTokenResponse(await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  }));
}

export async function refreshMailboxAccessToken(
  provider: LeadFollowMailboxProvider,
  refreshToken: string,
) {
  const { clientId, clientSecret } = providerClient(provider);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const endpoint = provider === 'google'
    ? 'https://oauth2.googleapis.com/token'
    : `https://login.microsoftonline.com/${encodeURIComponent(microsoftTenant())}/oauth2/v2.0/token`;
  if (provider === 'microsoft') body.set('scope', MICROSOFT_SCOPES.join(' '));
  return parseTokenResponse(await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  }));
}

export async function fetchMailboxIdentity(provider: LeadFollowMailboxProvider, accessToken: string) {
  if (provider === 'google') {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({})) as { email?: string; name?: string };
    const email = payload.email?.trim().toLowerCase() || '';
    if (!response.ok || !email) throw new Error('Google mailbox identity could not be verified.');
    return { email, displayName: payload.name?.trim() || '' };
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({})) as {
    mail?: string;
    userPrincipalName?: string;
    displayName?: string;
  };
  const email = (payload.mail || payload.userPrincipalName || '').trim().toLowerCase();
  if (!response.ok || !email) throw new Error('Microsoft mailbox identity could not be verified.');
  return { email, displayName: payload.displayName?.trim() || '' };
}

function encodeSubject(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function safeSenderName(value: string | undefined) {
  return (value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120);
}

export async function sendMailboxMessage(args: {
  provider: LeadFollowMailboxProvider;
  accessToken: string;
  senderEmail: string;
  senderName?: string;
  recipientEmail: string;
  subject: string;
  body: string;
}) {
  if (args.provider === 'google') {
    const senderName = safeSenderName(args.senderName);
    const fromHeader = senderName
      ? `${encodeSubject(senderName)} <${args.senderEmail}>`
      : args.senderEmail;
    const raw = [
      `From: ${fromHeader}`,
      `To: ${args.recipientEmail}`,
      `Subject: ${encodeSubject(args.subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      args.body,
    ].join('\r\n');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: Buffer.from(raw, 'utf8').toString('base64url') }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({})) as { id?: string; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || 'Gmail rejected the email.');
    return { providerMessageId: payload.id || '' };
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject: args.subject,
        body: { contentType: 'Text', content: args.body },
        toRecipients: [{ emailAddress: { address: args.recipientEmail } }],
      },
      saveToSentItems: true,
    }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(payload.error?.message || 'Microsoft Graph rejected the email.');
  }
  return { providerMessageId: '' };
}

export function mailboxScopes(provider: LeadFollowMailboxProvider) {
  return provider === 'google' ? [...GOOGLE_SCOPES] : [...MICROSOFT_SCOPES];
}
