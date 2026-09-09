import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

declare const Deno: {
  env: { get(key: string): string | undefined };
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SITE_URL = (Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? "https://summeca.com").replace(/\/$/, "");
const FROM_EMAIL = Deno.env.get("EMAIL_FROM") ?? "no-reply@summeca.com";
const INTERNAL_SECRET = Deno.env.get("EMAIL_INTERNAL_SECRET") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BRAND = "SUMMECA";

const EMAIL_TYPES = new Set([
  "order_confirmation", "payment_receipt", "download_link", "password_reset", "renewal_reminder",
  "refund_confirmation", "refund_requested", "refund_approved", "refund_rejected", "refund_completed",
  "subscription_activated", "subscription_cancelled", "payment_failed", "plan_changed",
  "support_ticket_created", "support_reply_received", "support_ticket_closed",
  "security_new_login", "security_password_changed", "security_alert",
]);

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function isAuthorized(req: Request): boolean {
  const internalSecret = req.headers.get("x-internal-secret") ?? "";
  if (INTERNAL_SECRET && constantTimeEqual(internalSecret, INTERNAL_SECRET)) return true;
  const authorization = req.headers.get("Authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  return Boolean(SERVICE_ROLE_KEY) && constantTimeEqual(bearer, SERVICE_ROLE_KEY);
}

function safeUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "#";
  try {
    const url = raw.startsWith("/") ? new URL(raw, SITE_URL) : new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "#";
    return esc(url.toString());
  } catch {
    return "#";
  }
}

function date(value: unknown): string {
  if (!value) return "";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return esc(value);
  return esc(parsed.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }));
}

function moneyMinor(amount: unknown, currency: unknown): string {
  const number = Number(amount);
  const code = String(currency ?? "USD").toUpperCase();
  if (!Number.isFinite(number)) return "";
  return esc(`${code} ${(number / 100).toFixed(code === "JPY" ? 0 : 2)}`);
}

function moneyDecimal(amount: unknown, currency: unknown): string {
  const number = Number(amount);
  const code = String(currency ?? "USD").toUpperCase();
  if (!Number.isFinite(number)) return "";
  return esc(`${code} ${number.toFixed(code === "JPY" ? 0 : 2)}`);
}

function row(label: string, value: unknown): string {
  const text = esc(value);
  if (!text) return "";
  return `<tr><td class="label">${esc(label)}</td><td class="value">${text}</td></tr>`;
}

function button(label: string, href: unknown): string {
  const url = safeUrl(href);
  if (url === "#") return "";
  return `<a class="button" href="${url}">${esc(label)}</a>`;
}

function baseTemplate(title: string, intro: string, content: string, note = ""): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
body{margin:0;background:#f4f7f8;color:#334155;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}.wrap{max-width:620px;margin:0 auto;padding:32px 16px}.brand{text-align:center;font-size:25px;font-weight:800;color:#0d9488;margin-bottom:22px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden}.accent{height:4px;background:linear-gradient(90deg,#0d9488,#22d3ee)}.body{padding:34px}.body h1{margin:0 0 10px;color:#0f172a;font-size:22px}.intro{margin:0 0 24px;color:#64748b;line-height:1.65;font-size:14px}.meta{width:100%;border-collapse:collapse;margin:10px 0 24px}.meta td{padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px}.label{color:#94a3b8;width:42%}.value{text-align:right;color:#0f172a;font-weight:600}.button{display:inline-block;background:#0d9488;color:#fff!important;text-decoration:none;padding:12px 22px;border-radius:9px;font-size:14px;font-weight:700;margin:4px 0 18px}.note{margin-top:20px;padding:13px 14px;background:#f0fdfa;border:1px solid #ccfbf1;border-radius:10px;color:#475569;font-size:12px;line-height:1.6}.footer{padding:22px 34px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;color:#94a3b8;font-size:11px;line-height:1.6}.footer a{color:#0d9488;text-decoration:none}@media(max-width:480px){.body{padding:26px 22px}.value{text-align:left}.label{width:36%}}
</style></head><body><div class="wrap"><div class="brand">${BRAND}</div><div class="card"><div class="accent"></div><div class="body"><h1>${esc(title)}</h1><p class="intro">${esc(intro)}</p>${content}${note ? `<div class="note">${esc(note)}</div>` : ""}</div><div class="footer"><a href="${safeUrl(SITE_URL)}">summeca.com</a> · <a href="${safeUrl(SITE_URL + "/support")}">Support</a><br>Transactional message related to your SUMMECA account or order.</div></div></div></body></html>`;
}

function buildEmail(type: string, data: Record<string, unknown>): { subject: string; html: string } {
  const name = String(data.customerName ?? "there");
  const product = String(data.productName ?? "SUMMECA product");
  const plan = String(data.planName ?? "");
  const order = String(data.orderId ?? "");
  const dashboard = SITE_URL + "/user-dashboard";

  switch (type) {
    case "order_confirmation": {
      const subject = `Order received — ${product}`;
      const content = `<table class="meta">${row("Order", order ? `#${order.slice(0, 8).toUpperCase()}` : "")}${row("Product", product)}${row("Plan", plan)}${row("Plan period", data.billingPeriod)}${row("Order amount", moneyMinor(data.amount, data.currency))}${row("Created", date(data.createdAt))}${row("Status", Number(data.amount) > 0 ? "Pending payment verification" : "Order received")}</table>${button("View order", dashboard + "/orders")}`;
      return { subject, html: baseTemplate("Order received", `Hi ${name}, we received your order.`, content, Number(data.amount) > 0 ? "Paid access is not granted until the payment provider confirms the transaction server-side." : "Free access is granted only after the protected free-order flow completes successfully.") };
    }
    case "payment_receipt": {
      const subject = `Payment verified — ${product}`;
      const content = `<table class="meta">${row("Order", order ? `#${order.slice(0, 8).toUpperCase()}` : "")}${row("Product", product)}${row("Plan", plan)}${row("Amount paid", moneyMinor(data.amount, data.currency))}${row("Provider", data.provider)}${row("Transaction reference", data.providerRef)}${row("Verified", date(data.paidAt))}${row("Status", "Paid and verified")}</table>${button("View orders", dashboard + "/orders")}`;
      return { subject, html: baseTemplate("Payment verified", `Hi ${name}, SUMMECA received server-side confirmation of your payment.`, content) };
    }
    case "download_link": {
      const subject = `Download available — ${product}`;
      const content = `<table class="meta">${row("Product", product)}${row("Order", order ? `#${order.slice(0, 8).toUpperCase()}` : "")}${row("Entitlement expiry", date(data.expiresAt))}</table>${button("Open secure download", data.downloadUrl)}${button("Open downloads", dashboard + "/downloads")}`;
      return { subject, html: baseTemplate("Your download is available", `Hi ${name}, a download entitlement is available for your completed order.`, content, "Download availability, expiration, and limits follow the entitlement shown in your SUMMECA dashboard.") };
    }
    case "password_reset": {
      const subject = "Reset your SUMMECA password";
      return { subject, html: baseTemplate("Reset your password", `Hi ${name}, a password reset was requested for your account.`, button("Reset password", data.resetUrl), "If you did not request this, do not use the reset link.") };
    }
    case "renewal_reminder": {
      const subject = `Plan access reminder — ${product}`;
      const content = `<table class="meta">${row("Product", product)}${row("Plan", plan)}${row("Plan amount", moneyMinor(data.amount, data.currency))}${row("Current period date", date(data.renewalDate))}</table>${button("View plan access", dashboard + "/subscriptions")}`;
      return { subject, html: baseTemplate("Plan access reminder", `Hi ${name}, this is a reminder about the current period for your SUMMECA plan.`, content, "This message does not by itself mean that an automatic renewal or provider-side recurring billing agreement exists. Check your payment provider and checkout terms for the actual billing arrangement.") };
    }
    case "refund_confirmation": {
      const subject = `Refund recorded — ${product}`;
      const content = `<table class="meta">${row("Order", order ? `#${order.slice(0, 8).toUpperCase()}` : "")}${row("Product", product)}${row("Plan", plan)}${row("Refund amount", moneyDecimal(data.amount, data.currency))}${row("Recorded", date(data.refundedAt))}${row("Reason", data.reason)}</table>${button("View orders", dashboard + "/orders")}`;
      return { subject, html: baseTemplate("Refund recorded", `Hi ${name}, SUMMECA recorded the refund as completed after the applicable provider workflow.`, content, "The time for funds to become visible depends on the payment provider and financial institution; SUMMECA does not guarantee a specific settlement timeframe.") };
    }
    case "refund_requested": {
      const subject = `Refund request received — ${product}`;
      const content = `<table class="meta">${row("Refund", data.refundId ? `#${String(data.refundId).slice(0, 8).toUpperCase()}` : "")}${row("Order", order ? `#${order.slice(0, 8).toUpperCase()}` : "")}${row("Product", product)}${row("Requested amount", moneyDecimal(data.amount, data.currency))}${row("Reason", data.reason)}${row("Requested", date(data.requestedAt))}${row("Status", "Pending review")}</table>${button("View orders", dashboard + "/orders")}`;
      return { subject, html: baseTemplate("Refund request received", `Hi ${name}, your refund request has been recorded for review.`, content, "Submitting a request does not guarantee approval or a specific review or payout timeframe.") };
    }
    case "refund_approved":
    case "refund_rejected":
    case "refund_completed": {
      const status = type === "refund_approved" ? "Approved" : type === "refund_rejected" ? "Not approved" : "Completed";
      const subject = `Refund update — ${product}`;
      const content = `<table class="meta">${row("Order", order ? `#${order.slice(0, 8).toUpperCase()}` : "")}${row("Product", product)}${row("Amount", moneyDecimal(data.amount, data.currency))}${row("Status", status)}${row("Updated", date(data.updatedAt))}${row("Admin note", data.adminNote)}</table>${button("View orders", dashboard + "/orders")}`;
      const note = type === "refund_completed" ? "Provider or bank settlement timing can vary; no specific arrival date is guaranteed." : "This status reflects SUMMECA's current refund record. Provider-side processing may have additional states when applicable.";
      return { subject, html: baseTemplate("Refund status updated", `Hi ${name}, the status of your refund request has changed.`, content, note) };
    }
    case "subscription_activated": {
      const subject = `Plan access active — ${product}`;
      const content = `<table class="meta">${row("Product", product)}${row("Plan", plan)}${row("Plan period", data.billingPeriod)}${row("Period date", date(data.renewalDate))}${row("Access status", "Active")}</table>${button("View plan access", dashboard + "/subscriptions")}`;
      return { subject, html: baseTemplate("Plan access active", `Hi ${name}, your SUMMECA plan access is active.`, content, "A monthly or yearly plan period does not automatically imply recurring billing. Automatic renewal exists only when checkout and the payment provider explicitly create a recurring agreement.") };
    }
    case "subscription_cancelled": {
      const subject = `Plan access update — ${product}`;
      const content = `<table class="meta">${row("Product", product)}${row("Plan", plan)}${row("Access through", date(data.accessUntil))}${row("Updated", date(data.cancelledAt))}${row("Reason", data.reason)}</table>${button("View plan access", dashboard + "/subscriptions")}`;
      return { subject, html: baseTemplate("Plan access updated", `Hi ${name}, your SUMMECA access record was updated.`, content, "A SUMMECA access-status change is not proof that a separate provider-side recurring billing agreement was cancelled. Verify any external billing agreement directly with the payment provider.") };
    }
    case "payment_failed": {
      const subject = `Payment not completed — ${product}`;
      const content = `<table class="meta">${row("Product", product)}${row("Plan", plan)}${row("Attempted amount", moneyMinor(data.amount, data.currency))}${row("Time", date(data.failedAt))}${row("Reason", data.reason)}</table>${button("Return to checkout", data.retryUrl)}`;
      return { subject, html: baseTemplate("Payment not completed", `Hi ${name}, this payment attempt was not confirmed.`, content, "No paid access is granted from an unverified payment attempt.") };
    }
    case "plan_changed": {
      const subject = `Plan access updated — ${product}`;
      const content = `<table class="meta">${row("Product", product)}${row("Previous plan", data.oldPlanName)}${row("New plan", data.newPlanName)}${row("Change", data.changeType)}${row("Effective", date(data.effectiveDate))}</table>${button("View plan access", dashboard + "/subscriptions")}`;
      return { subject, html: baseTemplate("Plan access updated", `Hi ${name}, your SUMMECA plan record has been updated.`, content, "SUMMECA does not claim automatic proration or provider-side plan changes unless the payment provider explicitly confirms them.") };
    }
    case "support_ticket_created": {
      const subject = `Support ticket received — ${String(data.subject ?? "SUMMECA support")}`;
      const content = `<table class="meta">${row("Ticket", data.ticketId ? `#${String(data.ticketId).slice(0, 8).toUpperCase()}` : "")}${row("Subject", data.subject)}${row("Category", data.category)}${row("Priority", data.priority)}</table>${button("Open ticket", data.ticketUrl)}`;
      return { subject, html: baseTemplate("Support ticket received", `Hi ${name}, your support ticket has been recorded.`, content) };
    }
    case "support_reply_received": {
      const subject = `New support reply — ${String(data.subject ?? "SUMMECA support")}`;
      const content = `<table class="meta">${row("Ticket", data.ticketId ? `#${String(data.ticketId).slice(0, 8).toUpperCase()}` : "")}${row("Subject", data.subject)}${row("Reply preview", data.replyPreview)}</table>${button("Open ticket", data.ticketUrl)}`;
      return { subject, html: baseTemplate("New support reply", `Hi ${name}, there is a new reply on your SUMMECA support ticket.`, content) };
    }
    case "support_ticket_closed": {
      const subject = `Support ticket closed — ${String(data.subject ?? "SUMMECA support")}`;
      return { subject, html: baseTemplate("Support ticket closed", `Hi ${name}, this support ticket is marked closed.`, `<table class="meta">${row("Ticket", data.ticketId ? `#${String(data.ticketId).slice(0, 8).toUpperCase()}` : "")}${row("Subject", data.subject)}</table>${button("View support", data.ticketUrl)}`) };
    }
    case "security_new_login": {
      const subject = "New sign-in to your SUMMECA account";
      const content = `<table class="meta">${row("Time", date(data.loginAt))}${row("Device", data.device)}${row("Location", data.location)}</table>${button("Review account security", data.securityUrl)}`;
      return { subject, html: baseTemplate("New account sign-in", `Hi ${name}, a new sign-in was recorded for your account.`, content, "If this was not you, change your password and review your account security immediately.") };
    }
    case "security_password_changed": {
      const subject = "Your SUMMECA password was changed";
      return { subject, html: baseTemplate("Password changed", `Hi ${name}, your account password was changed.`, `${row("Changed", date(data.changedAt))}${button("Review account security", data.securityUrl)}`, "If you did not make this change, secure your account immediately.") };
    }
    case "security_alert": {
      const subject = "SUMMECA security alert";
      return { subject, html: baseTemplate("Security alert", `Hi ${name}, SUMMECA recorded a security event on your account.`, `<table class="meta">${row("Alert", data.alertMessage)}${row("Detected", date(data.detectedAt))}</table>${button("Review account security", data.securityUrl)}`) };
    }
    default:
      throw new Error("Unsupported email type");
  }
}

async function hashRecipient(email: string): Promise<string> {
  try {
    const bytes = new TextEncoder().encode(email.toLowerCase().trim());
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).slice(0, 8).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return "unknown";
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

serve(async (req) => {
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);
  if (!isAuthorized(req)) return json({ success: false, error: "Unauthorized" }, 401);
  if (!RESEND_API_KEY) return json({ success: false, error: "Email provider is not configured" }, 503);

  let payload: { type?: string; to?: string; data?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const type = String(payload.type ?? "");
  const to = String(payload.to ?? "").trim().toLowerCase();
  const data = payload.data && typeof payload.data === "object" ? payload.data : {};
  if (!EMAIL_TYPES.has(type)) return json({ success: false, error: "Unsupported email type" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 254) return json({ success: false, error: "Invalid recipient" }, 400);

  let email;
  try {
    email = buildEmail(type, data);
  } catch (error) {
    console.error(JSON.stringify({ event: "email_template_error", type, error: error instanceof Error ? error.message : "unknown" }));
    return json({ success: false, error: "Email template failed" }, 500);
  }

  const recipientHash = await hashRecipient(to);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject: email.subject, html: email.html }),
    });
    const result = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
    if (!response.ok) {
      console.error(JSON.stringify({ event: "email_send", type, recipientHash, success: false, status: response.status, error: result.message ?? result.name ?? "provider_error" }));
      return json({ success: false, error: "Email provider rejected the request" }, 502);
    }
    console.log(JSON.stringify({ event: "email_send", type, recipientHash, success: true, providerResponseId: result.id ?? null }));
    return json({ success: true, id: result.id ?? null });
  } catch (error) {
    console.error(JSON.stringify({ event: "email_send", type, recipientHash, success: false, error: error instanceof Error ? error.message : "network_error" }));
    return json({ success: false, error: "Email provider request failed" }, 502);
  }
});
