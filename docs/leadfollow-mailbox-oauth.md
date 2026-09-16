# LeadFollow connected mailbox setup

LeadFollow can send reviewed email drafts from each customer's own Gmail/Google Workspace or Outlook/Microsoft 365 mailbox.

## Server secrets

Configure these only in the production server/Cloudflare environment. Do not expose them as `NEXT_PUBLIC_*` values.

- `EMAIL_OAUTH_ENCRYPTION_KEY` — long random secret used to encrypt refresh tokens at rest.
- `GMAIL_OAUTH_CLIENT_ID`
- `GMAIL_OAUTH_CLIENT_SECRET`
- `MICROSOFT_OAUTH_CLIENT_ID`
- `MICROSOFT_OAUTH_CLIENT_SECRET`
- `MICROSOFT_OAUTH_TENANT_ID` — optional; defaults to `common`.

The existing Supabase and email delivery secrets remain unchanged.

## Google OAuth app

Create a Google OAuth web application, enable the Gmail API, and add this authorized redirect URI:

`https://summeca.com/api/leadfollow/email-connections/google/callback`

Requested scopes are limited to identity plus Gmail send:

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/gmail.send`

Google may require OAuth consent-screen verification before broad public use of the Gmail scope.

## Microsoft Entra app

Create a Microsoft Entra web application and add this redirect URI:

`https://summeca.com/api/leadfollow/email-connections/microsoft/callback`

Delegated scopes:

- `offline_access`
- `openid`
- `profile`
- `email`
- `User.Read`
- `Mail.Send`

## Runtime behavior

- The customer connects a mailbox from **Dashboard → SUMMECA Apps → Email Sender**.
- SUMMECA never receives the mailbox password.
- The provider refresh token is AES-256-GCM encrypted before it is stored in the server-only `leadfollow_email_connections` table.
- Browser roles have no direct database access to mailbox tokens.
- A connected mailbox is preferred for sending. If a customer has never connected a mailbox, the existing SUMMECA delivery route remains available as a safe fallback so existing production behavior does not break.
- If a previously connected mailbox becomes invalid, LeadFollow fails closed and asks the customer to reconnect instead of silently changing sender identity.
- Sending remains explicit and user-triggered after draft review; connecting a mailbox does not enable unattended bulk email.
