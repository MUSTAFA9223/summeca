/**
 * Server-side notification helper for SUMMECA V33.
 * Use this to create in-app notifications for users.
 * Never call from client components.
 */

import { createClient } from '@/lib/supabase/server';

export type NotificationType =
  | 'order' |'payment' |'subscription' |'refund' |'wishlist' |'recommendation' |'announcement';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
}

/**
 * Create a single in-app notification for a user.
 * Delivered in real-time via Supabase Realtime.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('notifications').insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      action_url: input.actionUrl ?? null,
      read: false,
    });
    if (error) {
      console.error('[createNotification] Failed:', error.message);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[createNotification] Unexpected error:', message);
  }
}

/**
 * Check if user has opted in to a specific email notification type.
 * Returns true if no preferences set (defaults to opted-in).
 */
export async function checkEmailPreference(
  userId: string,
  prefKey: 'email_orders' | 'email_marketing' | 'email_product_updates' | 'email_subscription'
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('notification_preferences')
      .select(prefKey)
      .eq('user_id', userId)
      .single();

    if (!data) return true; // Default: opted in
    return (data as Record<string, boolean>)[prefKey] ?? true;
  } catch {
    return true; // Default: opted in on error
  }
}
