/**
 * GET /api/wishlist/items
 * Get full wishlist items with product details for the current user.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase?.auth?.getUser();
  if (!user) {
    return NextResponse?.json({ items: [] });
  }

  const { data, error } = await supabase?.from('wishlist_items')?.select(`
      id,
      created_at,
      product_id,
      products:product_id (
        id, name, slug, short_desc, category, thumbnail_url, tags, metadata,
        plans:product_plans(price, billing_period, is_active, sort_order)
      )
    `)?.eq('user_id', user?.id)?.order('created_at', { ascending: false });

  if (error) return NextResponse?.json({ items: [] });

  return NextResponse?.json({ items: data ?? [] });
}
