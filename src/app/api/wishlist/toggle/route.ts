/**
 * POST /api/wishlist/toggle
 * Add or remove a product from the user's wishlist.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { product_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { product_id } = body;
  if (!product_id) {
    return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
  }

  // Check if already in wishlist
  const { data: existing } = await supabase
    .from('wishlist_items')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', product_id)
    .single();

  if (existing) {
    // Remove from wishlist
    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', product_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ wishlisted: false });
  } else {
    // Add to wishlist
    const { error } = await supabase
      .from('wishlist_items')
      .insert({ user_id: user.id, product_id });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ wishlisted: true });
  }
}

/**
 * GET /api/wishlist/toggle
 * Get all wishlist product IDs for the current user.
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ wishlistIds: [] });
  }

  const { data, error } = await supabase
    .from('wishlist_items')
    .select('product_id')
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ wishlistIds: [] });

  return NextResponse.json({ wishlistIds: (data ?? []).map((w) => w.product_id) });
}
