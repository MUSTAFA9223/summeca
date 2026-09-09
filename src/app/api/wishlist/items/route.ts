/**
 * GET /api/wishlist/items
 * Return the authenticated user's wishlist with real active pricing metadata.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError || !auth.user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  const { data, error } = await supabase
    .from('wishlist_items')
    .select(`
      id,
      created_at,
      product_id,
      products:product_id (
        id, name, slug, short_desc, category, thumbnail_url, tags, metadata, status,
        plans:product_plans(
          price, currency, billing_period, is_active, sort_order,
          sale_price, sale_starts_at, sale_ends_at
        )
      )
    `)
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[wishlist/items] Failed to load wishlist:', error.message);
    return NextResponse.json(
      { error: 'Could not load your wishlist.' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  return NextResponse.json(
    { items: data ?? [] },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
