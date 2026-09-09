/**
 * Server-side email service for SUMMECA transactional emails.
 *
 * All emails are triggered server-side via Supabase Edge Function.
 * Nothing is stored in the database.
 * Never call this from client components.
 *
 * Required environment variables:
 *   RESEND_API_KEY         — Resend API key (server-side only, never NEXT_PUBLIC_)
 *   EMAIL_FROM             — Sender address e.g. no-reply@summeca.com
 *   NEXT_PUBLIC_SITE_URL   — Site URL e.g. https://summeca.com
 *   EMAIL_INTERNAL_SECRET  — Optional: extra server-to-server auth header secret
 */

import { createClient, createServiceClient } from '@/lib/supabase/server';

export type EmailType =
  | 'order_confirmation' |'payment_receipt' |'download_link' |'password_reset' |'renewal_reminder' |'refund_confirmation' |'refund_requested' |'refund_approved' |'refund_rejected' |'refund_completed'
  | 'subscription_activated'| 'subscription_cancelled' | 'payment_failed' | 'plan_changed' |'support_ticket_created' | 'support_reply_received' | 'support_ticket_closed' |'security_new_login' | 'security_password_changed' | 'security_alert';

export interface OrderConfirmationData {
  customerName: string;
  orderId: string;
  productName: string;
  planName: string;
  /** Amount in smallest currency unit (cents) */
  amount: number;
  currency: string;
  billingPeriod: string;
  createdAt: string;
}

export interface PaymentReceiptData {
  customerName: string;
  orderId: string;
  productName: string;
  planName: string;
  amount: number;
  currency: string;
  provider: string;
  providerRef: string;
  paidAt: string;
}

export interface DownloadLinkData {
  customerName: string;
  productName: string;
  downloadUrl: string;
  orderId: string;
  expiresAt?: string;
}

export interface PasswordResetData {
  customerName: string;
  resetUrl: string;
}

export interface RenewalReminderData {
  customerName: string;
  productName: string;
  planName: string;
  amount: number;
  currency: string;
  renewalDate: string;
  subscriptionId: string;
}

export interface RefundConfirmationData {
  customerName: string;
  orderId: string;
  productName: string;
  planName: string;
  /** Amount in decimal (e.g. 29.99) */
  amount: number;
  currency: string;
  refundedAt: string;
  reason?: string;
}

export interface RefundRequestedData {
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
}

export interface RefundStatusUpdateData {
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
}

export interface SubscriptionActivatedData {
  customerName: string;
  productName: string;
  planName: string;
  billingPeriod: string;
  amount: number;
  currency: string;
  renewalDate: string;
  subscriptionId: string;
}

export interface SubscriptionCancelledData {
  customerName: string;
  productName: string;
  planName: string;
  cancelledAt: string;
  accessUntil: string;
  reason?: string;
}

export interface PaymentFailedData {
  customerName: string;
  productName: string;
  planName: string;
  amount: number;
  currency: string;
  failedAt: string;
  reason?: string;
  retryUrl: string;
}

export interface PlanChangedData {
  customerName: string;
  productName: string;
  oldPlanName: string;
  newPlanName: string;
  changeType: 'upgrade' | 'downgrade';
  effectiveDate: string;
  amount: number;
  currency: string;
}

export interface SupportTicketCreatedData {
  customerName: string;
  ticketId: string;
  subject: string;
  category: string;
  priority: string;
  ticketUrl: string;
}

export interface SupportReplyReceivedData {
  customerName: string;
  ticketId: string;
  subject: string;
  replyPreview: string;
  ticketUrl: string;
}

export interface SupportTicketClosedData {
  customerName: string;
  ticketId: string;
  subject: string;
  ticketUrl: string;
}

export interface SecurityNewLoginData {
  customerName: string;
  loginAt: string;
  device?: string;
  location?: string;
  securityUrl: string;
}

export interface SecurityPasswordChangedData {
  customerName: string;
  changedAt: string;
  securityUrl: string;
}

export interface SecurityAlertData {
  customerName: string;
  alertMessage: string;
  detectedAt: string;
  securityUrl: string;
}

type EmailPayload =
  | { type: 'order_confirmation'; to: string; data: OrderConfirmationData }
  | { type: 'payment_receipt'; to: string; data: PaymentReceiptData }
  | { type: 'download_link'; to: string; data: DownloadLinkData }
  | { type: 'password_reset'; to: string; data: PasswordResetData }
  | { type: 'renewal_reminder'; to: string; data: RenewalReminderData }
  | { type: 'refund_confirmation'; to: string; data: RefundConfirmationData }
  | { type: 'refund_requested'; to: string; data: RefundRequestedData }
  | { type: 'refund_approved'; to: string; data: RefundStatusUpdateData }
  | { type: 'refund_rejected'; to: string; data: RefundStatusUpdateData }
  | { type: 'refund_completed'; to: string; data: RefundStatusUpdateData }
  | { type: 'subscription_activated'; to: string; data: SubscriptionActivatedData }
  | { type: 'subscription_cancelled'; to: string; data: SubscriptionCancelledData }
  | { type: 'payment_failed'; to: string; data: PaymentFailedData }
  | { type: 'plan_changed'; to: string; data: PlanChangedData }
  | { type: 'support_ticket_created'; to: string; data: SupportTicketCreatedData }
  | { type: 'support_reply_received'; to: string; data: SupportReplyReceivedData }
  | { type: 'support_ticket_closed'; to: string; data: SupportTicketClosedData }
  | { type: 'security_new_login'; to: string; data: SecurityNewLoginData }
  | { type: 'security_password_changed'; to: string; data: SecurityPasswordChangedData }
  | { type: 'security_alert'; to: string; data: SecurityAlertData };

/**
 * Send a transactional email via the Supabase Edge Function.
 * Server-side only — never call from client components.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: payload,
    });

    if (error) {
      console.error('[sendEmail] Edge function error:', error.message);
      return { success: false, error: error.message };
    }

    if (data && !data.success) {
      console.error('[sendEmail] Email send failed:', data.error);
      return { success: false, error: data.error };
    }

    console.log('[sendEmail] Sent successfully:', payload.type);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sendEmail] Unexpected error:', message);
    return { success: false, error: message };
  }
}

/**
 * Convenience: send order confirmation email.
 * Call after order is created (pending_payment state).
 */
export async function sendOrderConfirmation(
  to: string,
  data: OrderConfirmationData
): Promise<void> {
  const result = await sendEmail({ type: 'order_confirmation', to, data });
  if (!result.success) {
    console.warn('[sendEmail] order_confirmation failed:', result.error);
  }
}

/**
 * Convenience: send payment receipt email.
 * Call after webhook confirms payment completed.
 */
export async function sendPaymentReceipt(
  to: string,
  data: PaymentReceiptData
): Promise<void> {
  const result = await sendEmail({ type: 'payment_receipt', to, data });
  if (!result.success) {
    console.warn('[sendEmail] payment_receipt failed:', result.error);
  }
}

/**
 * Convenience: send download link email.
 * The email is suppressed unless a real, currently available private-file
 * entitlement exists for the completed order.
 */
export async function sendDownloadLink(
  to: string,
  data: DownloadLinkData
): Promise<void> {
  try {
    const service = createServiceClient();
    const { data: entitlement, error } = await service
      .from('downloads')
      .select('id, file_url, status, expires_at')
      .eq('order_id', data.orderId)
      .eq('status', 'available')
      .neq('file_url', '')
      .maybeSingle();

    const expired = entitlement?.expires_at
      ? new Date(entitlement.expires_at).getTime() <= Date.now()
      : false;

    if (error || !entitlement || expired || !String(entitlement.file_url ?? '').trim()) {
      console.info('[sendEmail] download_link skipped: no valid file entitlement for order', data.orderId);
      return;
    }
  } catch (error) {
    console.warn('[sendEmail] download_link skipped because entitlement validation failed:', error);
    return;
  }

  const result = await sendEmail({ type: 'download_link', to, data });
  if (!result.success) {
    console.warn('[sendEmail] download_link failed:', result.error);
  }
}

/**
 * Convenience: send password reset email.
 * Call when user requests a password reset.
 */
export async function sendPasswordReset(
  to: string,
  data: PasswordResetData
): Promise<void> {
  const result = await sendEmail({ type: 'password_reset', to, data });
  if (!result.success) {
    console.warn('[sendEmail] password_reset failed:', result.error);
  }
}

/**
 * Convenience: send subscription renewal reminder email.
 * Call from a scheduled job or cron when renewal is approaching.
 */
export async function sendRenewalReminder(
  to: string,
  data: RenewalReminderData
): Promise<void> {
  const result = await sendEmail({ type: 'renewal_reminder', to, data });
  if (!result.success) {
    console.warn('[sendEmail] renewal_reminder failed:', result.error);
  }
}

/**
 * Convenience: send subscription activated email.
 * Only recurring monthly/yearly plans have a meaningful renewal date.
 */
export async function sendSubscriptionActivated(
  to: string,
  data: SubscriptionActivatedData
): Promise<void> {
  if (data.billingPeriod !== 'monthly' && data.billingPeriod !== 'yearly') {
    console.info('[sendEmail] subscription_activated skipped for non-recurring plan:', data.billingPeriod);
    return;
  }

  const result = await sendEmail({ type: 'subscription_activated', to, data });
  if (!result.success) {
    console.warn('[sendEmail] subscription_activated failed:', result.error);
  }
}

/**
 * Convenience: send subscription cancelled email.
 */
export async function sendSubscriptionCancelled(
  to: string,
  data: SubscriptionCancelledData
): Promise<void> {
  const result = await sendEmail({ type: 'subscription_cancelled', to, data });
  if (!result.success) {
    console.warn('[sendEmail] subscription_cancelled failed:', result.error);
  }
}

/**
 * Convenience: send payment failed email.
 */
export async function sendPaymentFailed(
  to: string,
  data: PaymentFailedData
): Promise<void> {
  const result = await sendEmail({ type: 'payment_failed', to, data });
  if (!result.success) {
    console.warn('[sendEmail] payment_failed failed:', result.error);
  }
}

/**
 * Convenience: send plan changed email.
 */
export async function sendPlanChanged(
  to: string,
  data: PlanChangedData
): Promise<void> {
  const result = await sendEmail({ type: 'plan_changed', to, data });
  if (!result.success) {
    console.warn('[sendEmail] plan_changed failed:', result.error);
  }
}

/**
 * Convenience: send support ticket created email.
 */
export async function sendSupportTicketCreated(
  to: string,
  data: SupportTicketCreatedData
): Promise<void> {
  const result = await sendEmail({ type: 'support_ticket_created', to, data });
  if (!result.success) {
    console.warn('[sendEmail] support_ticket_created failed:', result.error);
  }
}

/**
 * Convenience: send support reply received email.
 */
export async function sendSupportReplyReceived(
  to: string,
  data: SupportReplyReceivedData
): Promise<void> {
  const result = await sendEmail({ type: 'support_reply_received', to, data });
  if (!result.success) {
    console.warn('[sendEmail] support_reply_received failed:', result.error);
  }
}

/**
 * Convenience: send support ticket closed email.
 */
export async function sendSupportTicketClosed(
  to: string,
  data: SupportTicketClosedData
): Promise<void> {
  const result = await sendEmail({ type: 'support_ticket_closed', to, data });
  if (!result.success) {
    console.warn('[sendEmail] support_ticket_closed failed:', result.error);
  }
}

/**
 * Convenience: send security new login email.
 */
export async function sendSecurityNewLogin(
  to: string,
  data: SecurityNewLoginData
): Promise<void> {
  const result = await sendEmail({ type: 'security_new_login', to, data });
  if (!result.success) {
    console.warn('[sendEmail] security_new_login failed:', result.error);
  }
}

/**
 * Convenience: send security password changed email.
 */
export async function sendSecurityPasswordChanged(
  to: string,
  data: SecurityPasswordChangedData
): Promise<void> {
  const result = await sendEmail({ type: 'security_password_changed', to, data });
  if (!result.success) {
    console.warn('[sendEmail] security_password_changed failed:', result.error);
  }
}

/**
 * Convenience: send security alert email.
 */
export async function sendSecurityAlert(
  to: string,
  data: SecurityAlertData
): Promise<void> {
  const result = await sendEmail({ type: 'security_alert', to, data });
  if (!result.success) {
    console.warn('[sendEmail] security_alert failed:', result.error);
  }
}
