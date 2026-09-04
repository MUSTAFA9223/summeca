import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// ─── Configuration ────────────────────────────────────────────────────────────

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SITE_URL = Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? "https://summeca.com";
const FROM_EMAIL = Deno.env.get("EMAIL_FROM") ?? "no-reply@summeca.com";
const INTERNAL_SECRET = Deno.env.get("EMAIL_INTERNAL_SECRET") ?? "";
const BRAND_NAME = "SUMMECA";

// ─── Security: HTML Escaping ──────────────────────────────────────────────────

function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

function escUrl(value: unknown): string {
  if (value === null || value === undefined) return "#";
  const str = String(value);
  // Only allow http/https URLs
  if (!/^https?:\/\//i.test(str)) return "#";
  return esc(str);
}

// ─── Safe Logging ─────────────────────────────────────────────────────────────

function logEmailEvent(params: {
  emailType: string;
  recipientHash: string;
  success: boolean;
  providerResponseId?: string;
  error?: string;
}): void {
  // Never log API keys, credentials, or sensitive payment data
  console.log(JSON.stringify({
    event: "email_send",
    emailType: params.emailType,
    recipientHash: params.recipientHash,
    success: params.success,
    providerResponseId: params.providerResponseId ?? null,
    error: params.error ?? null,
    timestamp: new Date().toISOString(),
  }));
}

// Simple one-way hash for recipient identifier (never log raw email)
async function hashRecipient(email: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "unknown";
  }
}

// ─── Brand Base Template ──────────────────────────────────────────────────────

function baseTemplate(title: string, bodyHtml: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #374151; -webkit-font-smoothing: antialiased; }
    .email-wrapper { max-width: 620px; margin: 0 auto; padding: 32px 16px 48px; }
    .email-header { text-align: center; padding: 0 0 24px; }
    .logo-area { display: inline-block; }
    .logo-text { font-size: 26px; font-weight: 800; color: #0d9488; letter-spacing: -1px; text-decoration: none; }
    .logo-dot { color: #134e4a; }
    .email-card { background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04); }
    .card-accent { height: 4px; background: linear-gradient(90deg, #0d9488 0%, #14b8a6 50%, #5eead4 100%); }
    .card-body { padding: 40px 40px 32px; }
    h1 { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 10px; line-height: 1.3; }
    .subtitle { font-size: 15px; color: #6b7280; margin: 0 0 28px; line-height: 1.6; }
    p { font-size: 15px; line-height: 1.65; color: #4b5563; margin: 0 0 16px; }
    .divider { border: none; border-top: 1px solid #f3f4f6; margin: 24px 0; }
    .meta-table { width: 100%; border-collapse: collapse; margin: 0 0 24px; }
    .meta-table tr { border-bottom: 1px solid #f3f4f6; }
    .meta-table tr:last-child { border-bottom: none; }
    .meta-table td { padding: 11px 0; font-size: 14px; vertical-align: top; }
    .meta-label { color: #9ca3af; font-weight: 500; width: 40%; }
    .meta-value { color: #111827; font-weight: 600; text-align: right; }
    .btn-primary { display: inline-block; background: #0d9488; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; letter-spacing: 0.2px; margin: 8px 0 24px; }
    .btn-secondary { display: inline-block; background: #f9fafb; color: #374151 !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; border: 1px solid #e5e7eb; margin: 4px 0 16px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-info { background: #dbeafe; color: #1e40af; }
    .security-notice { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 16px; margin: 20px 0; }
    .security-notice p { font-size: 13px; color: #78350f; margin: 0; }
    .email-footer { padding: 28px 40px; background: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center; }
    .footer-links { margin: 0 0 12px; }
    .footer-links a { color: #0d9488; text-decoration: none; font-size: 13px; font-weight: 500; margin: 0 10px; }
    .footer-copy { font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; }
    .footer-copy a { color: #6b7280; text-decoration: underline; }
    @media only screen and (max-width: 480px) {
      .card-body { padding: 28px 24px 24px; }
      .email-footer { padding: 20px 24px; }
      h1 { font-size: 20px; }
      .btn-primary { display: block; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div class="logo-area">
        <span class="logo-text">${BRAND_NAME}<span class="logo-dot">.</span></span>
      </div>
    </div>
    <div class="email-card">
      <div class="card-accent"></div>
      <div class="card-body">
        ${bodyHtml}
      </div>
      <div class="email-footer">
        <div class="footer-links">
          <a href="${escUrl(SITE_URL)}">Website</a>
          <a href="${escUrl(SITE_URL + "/user-dashboard")}">Dashboard</a>
          <a href="mailto:support@summeca.com">Support</a>
        </div>
        <p class="footer-copy">
          &copy; ${year} ${BRAND_NAME}. All rights reserved.<br/>
          You are receiving this email because of your activity on ${BRAND_NAME}.<br/>
          <a href="${escUrl(SITE_URL)}">summeca.com</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Template: Order Confirmation ─────────────────────────────────────────────

function orderConfirmationTemplate(data: {
  customerName: string;
  orderId: string;
  productName: string;
  planName: string;
  amount: number;
  currency: string;
  billingPeriod: string;
  createdAt: string;
}): { subject: string; html: string } {
  let subject = `Order Confirmed — ${esc(data.productName)}`;
  const orderShort = esc(data.orderId.slice(0, 8).toUpperCase());
  const dateStr = esc(new Date(data.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
  const amountStr = esc(`${data.currency} ${(data.amount / 100).toFixed(2)}`);

  let html = baseTemplate(subject, `
    <h1>Order Confirmed ✓</h1>
    <p class="subtitle">Hi ${esc(data.customerName) || "there"}, your order has been confirmed and is being processed.</p>
    <table class="meta-table">
      <tr><td class="meta-label">Order ID</td><td class="meta-value">#${orderShort}</td></tr>
      <tr><td class="meta-label">Product</td><td class="meta-value">${esc(data.productName)}</td></tr>
      <tr><td class="meta-label">Plan</td><td class="meta-value">${esc(data.planName)}</td></tr>
      <tr><td class="meta-label">Billing</td><td class="meta-value">${esc(data.billingPeriod)}</td></tr>
      <tr><td class="meta-label">Amount</td><td class="meta-value">${amountStr}</td></tr>
      <tr><td class="meta-label">Date</td><td class="meta-value">${dateStr}</td></tr>
      <tr><td class="meta-label">Status</td><td class="meta-value"><span class="badge badge-success">Confirmed</span></td></tr>
    </table>
    <a href="${escUrl(SITE_URL + "/user-dashboard/orders")}" class="btn-primary">View Order in Dashboard</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#9ca3af;">Questions? Contact us at <a href="mailto:support@summeca.com" style="color:#0d9488;">support@summeca.com</a></p>
  `);
  return { subject, html };
}

// ─── Template: Payment Receipt ────────────────────────────────────────────────

function paymentReceiptTemplate(data: {
  customerName: string;
  orderId: string;
  productName: string;
  planName: string;
  amount: number;
  currency: string;
  provider: string;
  providerRef: string;
  paidAt: string;
}): { subject: string; html: string } {
  let subject = `Payment Receipt — ${esc(data.productName)}`;
  const orderShort = esc(data.orderId.slice(0, 8).toUpperCase());
  const dateStr = esc(new Date(data.paidAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }));
  const amountStr = esc(`${data.currency} ${(data.amount / 100).toFixed(2)}`);

  let html = baseTemplate(subject, `
    <h1>Payment Receipt</h1>
    <p class="subtitle">Hi ${esc(data.customerName) || "there"}, we've received your payment. Here is your official receipt.</p>
    <table class="meta-table">
      <tr><td class="meta-label">Receipt #</td><td class="meta-value">${orderShort}</td></tr>
      <tr><td class="meta-label">Product</td><td class="meta-value">${esc(data.productName)}</td></tr>
      <tr><td class="meta-label">Plan</td><td class="meta-value">${esc(data.planName)}</td></tr>
      <tr><td class="meta-label">Amount Paid</td><td class="meta-value">${amountStr}</td></tr>
      <tr><td class="meta-label">Payment Method</td><td class="meta-value">${esc(data.provider)}</td></tr>
      ${data.providerRef ? `<tr><td class="meta-label">Transaction Ref</td><td class="meta-value" style="font-family:monospace;font-size:12px;">${esc(data.providerRef)}</td></tr>` : ""}
      <tr><td class="meta-label">Paid On</td><td class="meta-value">${dateStr}</td></tr>
      <tr><td class="meta-label">Status</td><td class="meta-value"><span class="badge badge-success">Paid</span></td></tr>
    </table>
    <a href="${escUrl(SITE_URL + "/user-dashboard/orders")}" class="btn-primary">View Dashboard</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#9ca3af;">Keep this email as your payment receipt. For billing inquiries contact <a href="mailto:billing@summeca.com" style="color:#0d9488;">billing@summeca.com</a></p>
  `);
  return { subject, html };
}

// ─── Template: Download Link ──────────────────────────────────────────────────

function downloadLinkTemplate(data: {
  customerName: string;
  productName: string;
  downloadUrl: string;
  orderId: string;
  expiresAt?: string;
}): { subject: string; html: string } {
  let subject = `Your Download is Ready — ${esc(data.productName)}`;
  const orderShort = esc(data.orderId.slice(0, 8).toUpperCase());
  const expiryRow = data.expiresAt
    ? `<tr><td class="meta-label">Link Expires</td><td class="meta-value"><span class="badge badge-warning">${esc(new Date(data.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}</span></td></tr>`
    : `<tr><td class="meta-label">Access</td><td class="meta-value">Available while account is active</td></tr>`;

  let html = baseTemplate(subject, `
    <h1>Your Download is Ready 🎉</h1>
    <p class="subtitle">Hi ${esc(data.customerName) || "there"}, thank you for your purchase! Your digital product is ready.</p>
    <table class="meta-table">
      <tr><td class="meta-label">Product</td><td class="meta-value">${esc(data.productName)}</td></tr>
      <tr><td class="meta-label">Order</td><td class="meta-value">#${orderShort}</td></tr>
      ${expiryRow}
    </table>
    <a href="${escUrl(data.downloadUrl)}" class="btn-primary">Download Now</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#9ca3af;">You can also access all your downloads anytime from your dashboard.</p>
    <a href="${escUrl(SITE_URL + "/user-dashboard/downloads")}" class="btn-secondary">Go to My Downloads</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#9ca3af;">Need help? Contact <a href="mailto:support@summeca.com" style="color:#0d9488;">support@summeca.com</a></p>
  `);
  return { subject, html };
}

// ─── Template: Password Reset ─────────────────────────────────────────────────

function passwordResetTemplate(data: {
  customerName: string;
  resetUrl: string;
}): { subject: string; html: string } {
  let subject = `Reset Your ${BRAND_NAME} Password`;
  let html = baseTemplate(subject, `
    <h1>Password Reset Request</h1>
    <p class="subtitle">Hi ${esc(data.customerName) || "there"}, we received a request to reset the password for your ${BRAND_NAME} account.</p>
    <a href="${escUrl(data.resetUrl)}" class="btn-primary">Reset My Password</a>
    <hr class="divider" />
    <div class="security-notice">
      <p>⚠️ <strong>Security Notice:</strong> This link expires in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email — your password will not change. Never share this link with anyone.</p>
    </div>
    <hr class="divider" />
    <p style="font-size:13px;color:#9ca3af;">${BRAND_NAME} will never ask for your password. If you need help, contact <a href="mailto:support@summeca.com" style="color:#0d9488;">support@summeca.com</a></p>
  `);
  return { subject, html };
}

// ─── Template: Subscription Renewal Reminder ─────────────────────────────────

function renewalReminderTemplate(data: {
  customerName: string;
  productName: string;
  planName: string;
  amount: number;
  currency: string;
  renewalDate: string;
  subscriptionId: string;
}): { subject: string; html: string } {
  const renewalDateFormatted = new Date(data.renewalDate).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  let subject = `Renewal Reminder — ${esc(data.productName)} renews on ${esc(renewalDateFormatted)}`;
  const fullDateStr = esc(new Date(data.renewalDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
  const amountStr = esc(`${data.currency} ${(data.amount / 100).toFixed(2)}`);

  let html = baseTemplate(subject, `
    <h1>Subscription Renewal Reminder</h1>
    <p class="subtitle">Hi ${esc(data.customerName) || "there"}, your ${BRAND_NAME} subscription is coming up for renewal.</p>
    <table class="meta-table">
      <tr><td class="meta-label">Product</td><td class="meta-value">${esc(data.productName)}</td></tr>
      <tr><td class="meta-label">Plan</td><td class="meta-value">${esc(data.planName)}</td></tr>
      <tr><td class="meta-label">Renewal Amount</td><td class="meta-value">${amountStr}</td></tr>
      <tr><td class="meta-label">Renewal Date</td><td class="meta-value"><span class="badge badge-warning">${fullDateStr}</span></td></tr>
    </table>
    <a href="${escUrl(SITE_URL + "/user-dashboard/subscriptions")}" class="btn-primary">Manage Subscription</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#9ca3af;">No action needed if you wish to continue. To cancel before renewal, visit your <a href="${escUrl(SITE_URL + "/user-dashboard/subscriptions")}" style="color:#0d9488;">subscription dashboard</a>.</p>
  `);
  return { subject, html };
}

// ─── Template: Refund Confirmation ───────────────────────────────────────────

function refundConfirmationTemplate(data: {
  customerName: string;
  orderId: string;
  productName: string;
  planName: string;
  amount: number;
  currency: string;
  refundedAt: string;
  reason?: string;
}): { subject: string; html: string } {
  let subject = `Refund Processed — ${esc(data.productName)}`;
  const orderShort = esc(data.orderId.slice(0, 8).toUpperCase());
  const dateStr = esc(new Date(data.refundedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
  const amountStr = esc(`${data.currency} ${Number(data.amount).toFixed(2)}`);

  let html = baseTemplate(subject, `
    <h1>Refund Processed ✓</h1>
    <p class="subtitle">Hi ${esc(data.customerName) || "there"}, your refund has been successfully processed. Please allow 3–10 business days for the funds to appear in your account.</p>
    <table class="meta-table">
      <tr><td class="meta-label">Order ID</td><td class="meta-value">#${orderShort}</td></tr>
      <tr><td class="meta-label">Product</td><td class="meta-value">${esc(data.productName)}</td></tr>
      ${data.planName ? `<tr><td class="meta-label">Plan</td><td class="meta-value">${esc(data.planName)}</td></tr>` : ""}
      <tr><td class="meta-label">Refund Amount</td><td class="meta-value">${amountStr}</td></tr>
      <tr><td class="meta-label">Refund Date</td><td class="meta-value">${dateStr}</td></tr>
      ${data.reason ? `<tr><td class="meta-label">Reason</td><td class="meta-value">${esc(data.reason)}</td></tr>` : ""}
      <tr><td class="meta-label">Status</td><td class="meta-value"><span class="badge badge-info">Refunded</span></td></tr>
    </table>
    <a href="${escUrl(SITE_URL + "/user-dashboard/orders")}" class="btn-primary">View My Orders</a>
    <hr class="divider" />
    <div class="security-notice">
      <p>💳 Refunds typically take <strong>3–10 business days</strong> to appear depending on your payment provider. If you have questions, contact <a href="mailto:billing@summeca.com" style="color:#92400e;">billing@summeca.com</a></p>
    </div>
    <hr class="divider" />
    <p style="font-size:13px;color:#9ca3af;">Need further assistance? Contact <a href="mailto:support@summeca.com" style="color:#0d9488;">support@summeca.com</a></p>
  `);
  return { subject, html };
}

// ─── Template: Refund Requested ──────────────────────────────────────────────

function refundRequestedTemplate(data: {
  customerName: string;
  orderId: string;
  refundId: string;
  productName: string;
  planName: string;
  amount: number;
  currency: string;
  reason: string;
  customerNote?: string;
  requestedAt: string;
}): { subject: string; html: string } {
  let subject = `Refund Request Received — ${esc(data.productName)}`;
  const orderShort = esc(data.orderId.slice(0, 8).toUpperCase());
  const refundShort = esc(data.refundId.slice(0, 8).toUpperCase());
  const dateStr = esc(new Date(data.requestedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
  const amountStr = esc(`${data.currency} ${Number(data.amount).toFixed(2)}`);

  const reasonLabels: Record<string, string> = {
    product_issue: "Product Issue",
    not_satisfied: "Not Satisfied",
    duplicate_purchase: "Duplicate Purchase",
    other: "Other",
  };
  const reasonLabel = reasonLabels[data.reason] ?? esc(data.reason);

  let html = baseTemplate(subject, `
    <h1>Refund Request Received</h1>
    <p class="subtitle">Hi ${esc(data.customerName) || "there"}, we have received your refund request and our team will review it within 1–3 business days.</p>
    <table class="meta-table">
      <tr><td class="meta-label">Refund ID</td><td class="meta-value">#${refundShort}</td></tr>
      <tr><td class="meta-label">Order ID</td><td class="meta-value">#${orderShort}</td></tr>
      <tr><td class="meta-label">Product</td><td class="meta-value">${esc(data.productName)}</td></tr>
      ${data.planName ? `<tr><td class="meta-label">Plan</td><td class="meta-value">${esc(data.planName)}</td></tr>` : ""}
      <tr><td class="meta-label">Refund Amount</td><td class="meta-value">${amountStr}</td></tr>
      <tr><td class="meta-label">Reason</td><td class="meta-value">${reasonLabel}</td></tr>
      <tr><td class="meta-label">Requested On</td><td class="meta-value">${dateStr}</td></tr>
      <tr><td class="meta-label">Status</td><td class="meta-value"><span class="badge badge-warning">Pending Review</span></td></tr>
    </table>
    ${data.customerNote ? `<p style="font-size:13px;color:#6b7280;"><strong>Your note:</strong> ${esc(data.customerNote)}</p>` : ""}
    <a href="${escUrl(SITE_URL + "/user-dashboard/orders")}" class="btn-primary">Track Refund Status</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#9ca3af;">You will receive an email update when your refund status changes. For questions, contact <a href="mailto:support@summeca.com" style="color:#0d9488;">support@summeca.com</a></p>
  `);
  return { subject, html };
}

// ─── Template: Refund Status Update (Approved / Rejected / Completed) ────────

function refundStatusTemplate(data: {
  customerName: string;
  orderId: string;
  refundId: string;
  productName: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
  adminNote?: string;
  updatedAt: string;
}, statusOverride: "approved" | "rejected" | "completed"): { subject: string; html: string } {
  const amountStr = esc(`${data.currency} ${Number(data.amount).toFixed(2)}`);
  const orderShort = esc(data.orderId.slice(0, 8).toUpperCase());
  const dateStr = esc(new Date(data.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));

  const configs: Record<string, { title: string; subtitle: string; badge: string; badgeClass: string; nextSteps: string }> = {
    approved: {
      title: "Refund Approved ✓",
      subtitle: `Hi ${esc(data.customerName) || "there"}, great news — your refund request has been approved and is now being processed.`,
      badge: "Approved",
      badgeClass: "badge-success",
      nextSteps: "Your refund is now being processed. You will receive another email once the funds have been sent. This typically takes 3–10 business days.",
    },
    rejected: {
      title: "Refund Request Update",
      subtitle: `Hi ${esc(data.customerName) || "there"}, we have reviewed your refund request for ${esc(data.productName)}.`,
      badge: "Not Approved",
      badgeClass: "badge-warning",
      nextSteps: "If you believe this decision is incorrect or need further assistance, please contact our support team at support@summeca.com.",
    },
    completed: {
      title: "Refund Completed ✓",
      subtitle: `Hi ${esc(data.customerName) || "there"}, your refund has been completed and the funds have been sent to your original payment method.`,
      badge: "Completed",
      badgeClass: "badge-success",
      nextSteps: "Please allow 3–10 business days for the funds to appear in your account, depending on your bank or payment provider.",
    },
  };

  const config = configs[statusOverride];
  let subject = statusOverride === "approved"
    ? `Refund Approved — ${esc(data.productName)}`
    : statusOverride === "completed"
    ? `Refund Completed — ${esc(data.productName)}`
    : `Refund Request Update — ${esc(data.productName)}`;

  let html = baseTemplate(subject, `
    <h1>${config.title}</h1>
    <p class="subtitle">${config.subtitle}</p>
    <table class="meta-table">
      <tr><td class="meta-label">Order ID</td><td class="meta-value">#${orderShort}</td></tr>
      <tr><td class="meta-label">Product</td><td class="meta-value">${esc(data.productName)}</td></tr>
      ${data.planName ? `<tr><td class="meta-label">Plan</td><td class="meta-value">${esc(data.planName)}</td></tr>` : ""}
      <tr><td class="meta-label">Refund Amount</td><td class="meta-value">${amountStr}</td></tr>
      <tr><td class="meta-label">Updated On</td><td class="meta-value">${dateStr}</td></tr>
      <tr><td class="meta-label">Status</td><td class="meta-value"><span class="badge ${config.badgeClass}">${config.badge}</span></td></tr>
    </table>
    ${data.adminNote ? `<div class="security-notice"><p><strong>Note from our team:</strong> ${esc(data.adminNote)}</p></div>` : ""}
    <p style="font-size:14px;color:#4b5563;">${config.nextSteps}</p>
    <a href="${escUrl(SITE_URL + "/user-dashboard/orders")}" class="btn-primary">View My Orders</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#9ca3af;">Questions? Contact <a href="mailto:support@summeca.com" style="color:#0d9488;">support@summeca.com</a> or <a href="mailto:billing@summeca.com" style="color:#0d9488;">billing@summeca.com</a></p>
  `);
  return { subject, html };
}

// ─── Template: Subscription Activated ────────────────────────────────────────

function subscriptionActivatedTemplate(data: {
  customerName: string;
  productName: string;
  planName: string;
  billingPeriod: string;
  amount: number;
  currency: string;
  renewalDate: string;
  subscriptionId: string;
}): { subject: string; html: string } {
  let subject = `Subscription Activated — ${esc(data.productName)}`;
  const renewalDateStr = esc(new Date(data.renewalDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
  const amountStr = esc(`${data.currency} ${Number(data.amount).toFixed(2)}`);
  const billingLabels: Record<string, string> = { monthly: "Monthly", yearly: "Yearly", lifetime: "Lifetime", one_time: "One-time" };
  const billingLabel = billingLabels[data.billingPeriod] ?? esc(data.billingPeriod);

  let html = baseTemplate(subject, `
    <h1>Subscription Activated 🎉</h1>
    <p class="subtitle">Hi ${esc(data.customerName) || "there"}, your subscription is now active. Welcome aboard!</p>
    <table class="meta-table">
      <tr><td class="meta-label">Product</td><td class="meta-value">${esc(data.productName)}</td></tr>
      <tr><td class="meta-label">Plan</td><td class="meta-value">${esc(data.planName)}</td></tr>
      <tr><td class="meta-label">Billing</td><td class="meta-value">${billingLabel}</td></tr>
      <tr><td class="meta-label">Amount</td><td class="meta-value">${amountStr}</td></tr>
      <tr><td class="meta-label">Next Renewal</td><td class="meta-value"><span class="badge badge-info">${renewalDateStr}</span></td></tr>
      <tr><td class="meta-label">Status</td><td class="meta-value"><span class="badge badge-success">Active</span></td></tr>
    </table>
    <a href="${escUrl(SITE_URL + "/user-dashboard/subscriptions")}" class="btn-primary">Manage Subscription</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#9ca3af;">You can manage, upgrade, or cancel your subscription anytime from your <a href="${escUrl(SITE_URL + "/user-dashboard/subscriptions")}" style="color:#0d9488;">dashboard</a>.</p>
  `);
  return { subject, html };
}

// ─── Template: Subscription Cancelled ────────────────────────────────────────

function subscriptionCancelledTemplate(data: {
  customerName: string;
  productName: string;
  planName: string;
  cancelledAt: string;
  accessUntil: string;
  reason?: string;
}): { subject: string; html: string } {
  let subject = `Subscription Cancelled — ${esc(data.productName)}`;
  const cancelDateStr = esc(new Date(data.cancelledAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
  const accessUntilStr = esc(new Date(data.accessUntil).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));

  let html = baseTemplate(subject, `
    <h1>Subscription Cancelled</h1>
    <p class="subtitle">Hi ${esc(data.customerName) || "there"}, your subscription has been cancelled. You'll retain access until the end of your billing period.</p>
    <table class="meta-table">
      <tr><td class="meta-label">Product</td><td class="meta-value">${esc(data.productName)}</td></tr>
      <tr><td class="meta-label">Plan</td><td class="meta-value">${esc(data.planName)}</td></tr>
      <tr><td class="meta-label">Cancelled On</td><td class="meta-value">${cancelDateStr}</td></tr>
      <tr><td class="meta-label">Access Until</td><td class="meta-value"><span class="badge badge-warning">${accessUntilStr}</span></td></tr>
      ${data.reason ? `<tr><td class="meta-label">Reason</td><td class="meta-value">${esc(data.reason)}</td></tr>` : ""}
      <tr><td class="meta-label">Status</td><td class="meta-value"><span class="badge badge-warning">Cancelled</span></td></tr>
    </table>
    <a href="${escUrl(SITE_URL + "/user-dashboard/subscriptions")}" class="btn-primary">View My Subscriptions</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#9ca3af;">Changed your mind? You can reactivate by visiting our <a href="${escUrl(SITE_URL + "/products")}" style="color:#0d9488;">products page</a>. We'd love to have you back.</p>
  `);
  return { subject, html };
}

// ─── Template: Payment Failed ─────────────────────────────────────────────────

function paymentFailedTemplate(data: {
  customerName: string;
  productName: string;
  planName: string;
  amount: number;
  currency: string;
  failedAt: string;
  reason?: string;
  retryUrl: string;
}): { subject: string; html: string } {
  let subject = `Payment Failed — Action Required for ${esc(data.productName)}`;
  const failedDateStr = esc(new Date(data.failedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
  const amountStr = esc(`${data.currency} ${Number(data.amount).toFixed(2)}`);

  let html = baseTemplate(subject, `
    <h1>Payment Failed ⚠️</h1>
    <p class="subtitle">Hi ${esc(data.customerName) || "there"}, we were unable to process your subscription payment. Please update your payment method to keep your subscription active.</p>
    <table class="meta-table">
      <tr><td class="meta-label">Product</td><td class="meta-value">${esc(data.productName)}</td></tr>
      <tr><td class="meta-label">Plan</td><td class="meta-value">${esc(data.planName)}</td></tr>
      <tr><td class="meta-label">Amount</td><td class="meta-value">${amountStr}</td></tr>
      <tr><td class="meta-label">Failed On</td><td class="meta-value">${failedDateStr}</td></tr>
      ${data.reason ? `<tr><td class="meta-label">Reason</td><td class="meta-value">${esc(data.reason)}</td></tr>` : ""}
      <tr><td class="meta-label">Status</td><td class="meta-value"><span class="badge badge-warning">Past Due</span></td></tr>
    </table>
    <a href="${escUrl(data.retryUrl)}" class="btn-primary">Retry Payment</a>
    <hr class="divider" />
    <div class="security-notice">
      <p>⚠️ <strong>Action Required:</strong> Your subscription will be suspended if payment is not resolved. Please retry or contact <a href="mailto:billing@summeca.com" style="color:#92400e;">billing@summeca.com</a> for assistance.</p>
    </div>
  `);
  return { subject, html };
}

// ─── Template: Plan Changed ───────────────────────────────────────────────────

function planChangedTemplate(data: {
  customerName: string;
  productName: string;
  oldPlanName: string;
  newPlanName: string;
  changeType: string;
  effectiveDate: string;
  amount: number;
  currency: string;
}): { subject: string; html: string } {
  const isUpgrade = data.changeType === "upgrade";
  let subject = isUpgrade
    ? `Plan Upgraded — ${esc(data.productName)}`
    : `Plan Change Scheduled — ${esc(data.productName)}`;
  const effectiveDateStr = esc(new Date(data.effectiveDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
  const amountStr = esc(`${data.currency} ${Number(data.amount).toFixed(2)}`);

  let html = baseTemplate(subject, `
    <h1>${isUpgrade ? "Plan Upgraded 🚀" : "Plan Change Scheduled"}</h1>
    <p class="subtitle">Hi ${esc(data.customerName) || "there"}, ${isUpgrade ? "your plan has been upgraded successfully." : "your plan change has been scheduled for your next renewal."}</p>
    <table class="meta-table">
      <tr><td class="meta-label">Product</td><td class="meta-value">${esc(data.productName)}</td></tr>
      <tr><td class="meta-label">Previous Plan</td><td class="meta-value">${esc(data.oldPlanName)}</td></tr>
      <tr><td class="meta-label">New Plan</td><td class="meta-value"><strong>${esc(data.newPlanName)}</strong></td></tr>
      <tr><td class="meta-label">New Amount</td><td class="meta-value">${amountStr}</td></tr>
      <tr><td class="meta-label">${isUpgrade ? "Effective" : "Effective From"}</td><td class="meta-value"><span class="badge badge-info">${effectiveDateStr}</span></td></tr>
    </table>
    <a href="${escUrl(SITE_URL + "/user-dashboard/subscriptions")}" class="btn-primary">View Subscription</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#9ca3af;">${isUpgrade ? "Your new plan features are available immediately." : "Your current plan remains active until the renewal date. No action needed."}</p>
  `);
  return { subject, html };
}

// ─── Send via Resend API ──────────────────────────────────────────────────────

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  emailType: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  if (!RESEND_API_KEY) {
    console.error("[send-email] RESEND_API_KEY is not configured.");
    return { success: false, error: "Email service not configured." };
  }

  const recipientHash = await hashRecipient(to);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    // Never log full errBody as it may contain sensitive info — log status only
    console.error("[send-email] Resend API error:", res.status);
    logEmailEvent({ emailType, recipientHash, success: false, error: `Resend API error: ${res.status}` });
    return { success: false, error: `Email delivery error: ${res.status}` };
  }

  let responseId: string | undefined;
  try {
    const resJson = await res.json() as { id?: string };
    responseId = resJson.id;
  } catch {
    // ignore parse error
  }

  logEmailEvent({ emailType, recipientHash, success: true, providerResponseId: responseId });
  return { success: true, id: responseId };
}

// ─── Authorization Check ──────────────────────────────────────────────────────

function isAuthorized(req: Request): boolean {
  // If no internal secret is configured, only allow requests from Supabase service role
  // (Edge Functions are called server-to-server via supabase.functions.invoke with service key)
  // Additionally support an explicit internal secret header for extra security
  if (INTERNAL_SECRET) {
    const authHeader = req.headers.get("x-internal-secret");
    if (authHeader === INTERNAL_SECRET) return true;
  }

  // Allow Supabase service-role invocations (Authorization: Bearer <service_role_key>)
  // The Supabase platform validates the JWT before reaching the function,
  // so if we reach here the caller is authenticated via Supabase auth.
  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return true;
  }

  return false;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, x-internal-secret",
      },
    });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Server-to-server authorization check
  if (!isAuthorized(req)) {
    console.warn("[send-email] Unauthorized request rejected.");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { type, to, data } = body as {
      type: "order_confirmation" | "payment_receipt" | "download_link" | "password_reset" | "renewal_reminder" | "refund_confirmation" | "refund_requested" | "refund_approved" | "refund_rejected" | "refund_completed" | "subscription_activated" | "subscription_cancelled" | "payment_failed" | "plan_changed";
      to: string;
      data: Record<string, unknown>;
    };

    if (!type || !to) {
      return new Response(JSON.stringify({ error: "Missing required fields: type, to" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return new Response(JSON.stringify({ error: "Invalid recipient email address" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let subject = "";
    let html = "";

    switch (type) {
      case "order_confirmation": {
        const t = orderConfirmationTemplate(data as Parameters<typeof orderConfirmationTemplate>[0]);
        subject = t.subject; html = t.html; break;
      }
      case "payment_receipt": {
        const t = paymentReceiptTemplate(data as Parameters<typeof paymentReceiptTemplate>[0]);
        subject = t.subject; html = t.html; break;
      }
      case "download_link": {
        const t = downloadLinkTemplate(data as Parameters<typeof downloadLinkTemplate>[0]);
        subject = t.subject; html = t.html; break;
      }
      case "password_reset": {
        const t = passwordResetTemplate(data as Parameters<typeof passwordResetTemplate>[0]);
        subject = t.subject; html = t.html; break;
      }
      case "renewal_reminder": {
        const t = renewalReminderTemplate(data as Parameters<typeof renewalReminderTemplate>[0]);
        subject = t.subject; html = t.html; break;
      }
      case "refund_confirmation": {
        const t = refundConfirmationTemplate(data as Parameters<typeof refundConfirmationTemplate>[0]);
        subject = t.subject; html = t.html; break;
      }
      case "refund_requested": {
        const t = refundRequestedTemplate(data as Parameters<typeof refundRequestedTemplate>[0]);
        subject = t.subject; html = t.html; break;
      }
      case "refund_approved": {
        const t = refundStatusTemplate(data as Parameters<typeof refundStatusTemplate>[0], "approved");
        subject = t.subject; html = t.html; break;
      }
      case "refund_rejected": {
        const t = refundStatusTemplate(data as Parameters<typeof refundStatusTemplate>[0], "rejected");
        subject = t.subject; html = t.html; break;
      }
      case "refund_completed": {
        const t = refundStatusTemplate(data as Parameters<typeof refundStatusTemplate>[0], "completed");
        subject = t.subject; html = t.html; break;
      }
      case "subscription_activated": {
        const t = subscriptionActivatedTemplate(data as Parameters<typeof subscriptionActivatedTemplate>[0]);
        subject = t.subject; html = t.html; break;
      }
      case "subscription_cancelled": {
        const t = subscriptionCancelledTemplate(data as Parameters<typeof subscriptionCancelledTemplate>[0]);
        subject = t.subject; html = t.html; break;
      }
      case "payment_failed": {
        const t = paymentFailedTemplate(data as Parameters<typeof paymentFailedTemplate>[0]);
        subject = t.subject; html = t.html; break;
      }
      case "plan_changed": {
        const t = planChangedTemplate(data as Parameters<typeof planChangedTemplate>[0]);
        subject = t.subject; html = t.html; break;
      }
      case "support_ticket_created": {
        const d = data as { customerName: string; ticketId: string; subject: string; category: string; priority: string; ticketUrl: string };
        subject = `[SUMMECA Support] Ticket Created: ${esc(d.subject)}`;
        html = baseTemplate(`Support Ticket Created`, `
          <h1>Support Ticket Created</h1>
          <p class="subtitle">Hi ${esc(d.customerName)}, your support ticket has been submitted successfully.</p>
          <table class="meta-table">
            <tr><td style="color:#6b7280;width:40%">Ticket ID</td><td style="font-weight:600;font-family:monospace">#${esc(d.ticketId.slice(0,8))}</td></tr>
            <tr><td style="color:#6b7280">Subject</td><td style="font-weight:600">${esc(d.subject)}</td></tr>
            <tr><td style="color:#6b7280">Category</td><td style="text-transform:capitalize">${esc(d.category)}</td></tr>
            <tr><td style="color:#6b7280">Priority</td><td style="text-transform:capitalize">${esc(d.priority)}</td></tr>
          </table>
          <p>Our support team will review your ticket and respond as soon as possible. You can track the status of your ticket in your dashboard.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${escUrl(d.ticketUrl)}" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">View Ticket</a>
          </div>
        `);
        break;
      }
      case "support_reply_received": {
        const d = data as { customerName: string; ticketId: string; subject: string; replyPreview: string; ticketUrl: string };
        subject = `[SUMMECA Support] New Reply: ${esc(d.subject)}`;
        html = baseTemplate(`Support Reply Received`, `
          <h1>New Reply on Your Ticket</h1>
          <p class="subtitle">Hi ${esc(d.customerName)}, the support team has replied to your ticket.</p>
          <table class="meta-table">
            <tr><td style="color:#6b7280;width:40%">Ticket</td><td style="font-weight:600">${esc(d.subject)}</td></tr>
            <tr><td style="color:#6b7280">Ticket ID</td><td style="font-family:monospace">#${esc(d.ticketId.slice(0,8))}</td></tr>
          </table>
          <div style="background:#f0fdfa;border-left:3px solid #0d9488;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
            <p style="margin:0;font-size:14px;color:#374151;font-style:italic">"${esc(d.replyPreview)}"</p>
          </div>
          <div style="text-align:center;margin:28px 0">
            <a href="${escUrl(d.ticketUrl)}" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">View Full Reply</a>
          </div>
        `);
        break;
      }
      case "support_ticket_closed": {
        const d = data as { customerName: string; ticketId: string; subject: string; ticketUrl: string };
        subject = `[SUMMECA Support] Ticket Closed: ${esc(d.subject)}`;
        html = baseTemplate(`Support Ticket Closed`, `
          <h1>Your Ticket Has Been Closed</h1>
          <p class="subtitle">Hi ${esc(d.customerName)}, your support ticket has been resolved and closed.</p>
          <table class="meta-table">
            <tr><td style="color:#6b7280;width:40%">Ticket</td><td style="font-weight:600">${esc(d.subject)}</td></tr>
            <tr><td style="color:#6b7280">Ticket ID</td><td style="font-family:monospace">#${esc(d.ticketId.slice(0,8))}</td></tr>
            <tr><td style="color:#6b7280">Status</td><td style="color:#0d9488;font-weight:700">Closed</td></tr>
          </table>
          <p>We hope your issue was resolved. If you need further assistance, you can always open a new support ticket from your dashboard.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${escUrl(d.ticketUrl)}" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">Open New Ticket</a>
          </div>
        `);
        break;
      }
      case "security_new_login": {
        const d = data as { customerName: string; loginAt: string; device?: string; location?: string; securityUrl: string };
        subject = `[SUMMECA Security] New Login Detected`;
        html = baseTemplate(`New Login Detected`, `
          <h1>New Login to Your Account</h1>
          <p class="subtitle">Hi ${esc(d.customerName)}, a new login was detected on your SUMMECA account.</p>
          <table class="meta-table">
            <tr><td style="color:#6b7280;width:40%">Time</td><td style="font-weight:600">${esc(new Date(d.loginAt).toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }))}</td></tr>
            ${d.device ? `<tr><td style="color:#6b7280">Device</td><td>${esc(d.device)}</td></tr>` : ""}
            ${d.location ? `<tr><td style="color:#6b7280">Location</td><td>${esc(d.location)}</td></tr>` : ""}
          </table>
          <div class="security-notice"><p>If this was you, no action is needed. If you did not log in, please change your password immediately and contact support.</p></div>
          <div style="text-align:center;margin:28px 0">
            <a href="${escUrl(d.securityUrl)}" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">Review Security Settings</a>
          </div>
        `);
        break;
      }
      case "security_password_changed": {
        const d = data as { customerName: string; changedAt: string; securityUrl: string };
        subject = `[SUMMECA Security] Password Changed Successfully`;
        html = baseTemplate(`Password Changed`, `
          <h1>Your Password Was Changed</h1>
          <p class="subtitle">Hi ${esc(d.customerName)}, your SUMMECA account password was successfully updated.</p>
          <table class="meta-table">
            <tr><td style="color:#6b7280;width:40%">Changed At</td><td style="font-weight:600">${esc(new Date(d.changedAt).toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }))}</td></tr>
            <tr><td style="color:#6b7280">Status</td><td style="color:#0d9488;font-weight:700">Confirmed</td></tr>
          </table>
          <div class="security-notice"><p>If you did not make this change, please contact support immediately and reset your password.</p></div>
          <div style="text-align:center;margin:28px 0">
            <a href="${escUrl(d.securityUrl)}" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">View Security Center</a>
          </div>
        `);
        break;
      }
      case "security_alert": {
        const d = data as { customerName: string; alertMessage: string; detectedAt: string; securityUrl: string };
        subject = `[SUMMECA Security] Security Alert — Action Required`;
        html = baseTemplate(`Security Alert`, `
          <h1>⚠️ Security Alert</h1>
          <p class="subtitle">Hi ${esc(d.customerName)}, we detected unusual activity on your account.</p>
          <table class="meta-table">
            <tr><td style="color:#6b7280;width:40%">Alert</td><td style="font-weight:600;color:#dc2626">${esc(d.alertMessage)}</td></tr>
            <tr><td style="color:#6b7280">Detected At</td><td>${esc(new Date(d.detectedAt).toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }))}</td></tr>
          </table>
          <div class="security-notice"><p>Please review your account security settings immediately. If you believe your account has been compromised, change your password and contact support.</p></div>
          <div style="text-align:center;margin:28px 0">
            <a href="${escUrl(d.securityUrl)}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px">Secure My Account</a>
          </div>
        `);
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    }

    const result = await sendViaResend(to, subject, html, type);

    return new Response(JSON.stringify({ success: result.success, id: result.id, error: result.error }), {
      status: result.success ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-email] Handler error:", message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
