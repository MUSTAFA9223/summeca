import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CATEGORIES = new Set(['ai_tool', 'template', 'dataset', 'api', 'plugin', 'course', 'other']);
const STATUSES = new Set(['active', 'draft', 'archived']);

const PRODUCT_COLUMNS = [
  'id',
  'name',
  'slug',
  'description',
  'short_desc',
  'category',
  'status',
  'thumbnail_url',
  'demo_url',
  'tags',
  'created_at',
  'updated_at',
].join(', ');

async function requireAdmin() {
  const sessionClient = await createClient();
  const {
    data: { user },
    error,
  } = await sessionClient.auth.getUser();

  if (error || !user) {
    return { error: noStoreJson({ error: 'Authentication required.' }, { status: 401 }) };
  }

  const { data: isAdmin, error: adminError } = await sessionClient.rpc('is_admin');

  if (adminError) {
    return {
      error: noStoreJson(
        { error: `Could not verify admin access: ${adminError.message}` },
        { status: 500 },
      ),
    };
  }

  if (!isAdmin) {
    return { error: noStoreJson({ error: 'Admin access required.' }, { status: 403 }) };
  }

  return { service: sessionClient };
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function cleanOptionalUrl(value: unknown, field: string) {
  const raw = cleanText(value, 2048);
  if (!raw) return '';

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${field} must be a valid URL.`);
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`${field} must use http or https.`);
  }

  return url.toString();
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((tag) => cleanText(tag, 40))
        .filter(Boolean)
        .slice(0, 20),
    ),
  );
}

function validateProduct(body: Record<string, unknown>) {
  const name = cleanText(body.name, 160);
  const slug = cleanText(body.slug, 180).toLowerCase();
  const description = cleanText(body.description, 12000);
  const shortDesc = cleanText(body.short_desc, 500);
  const category = cleanText(body.category, 40) || 'other';
  const status = cleanText(body.status, 20) || 'draft';

  if (!name) throw new Error('Product name is required.');
  if (!slug) throw new Error('Product slug is required.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Slug may contain lowercase letters, numbers and single hyphens only.');
  }
  if (!CATEGORIES.has(category)) throw new Error('Invalid product category.');
  if (!STATUSES.has(status)) throw new Error('Invalid product status.');

  return {
    name,
    slug,
    description,
    short_desc: shortDesc,
    category,
    status,
    thumbnail_url: cleanOptionalUrl(body.thumbnail_url, 'Thumbnail URL'),
    demo_url: cleanOptionalUrl(body.demo_url, 'Demo URL'),
    tags: normalizeTags(body.tags),
    updated_at: new Date().toISOString(),
  };
}

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

async function assertPublishable(
  service: Awaited<ReturnType<typeof createClient>>,
  productId: string,
) {
  const { count, error } = await service
    .from('product_plans')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
    .eq('is_active', true);

  if (error) throw new Error(`Could not validate product pricing: ${error.message}`);
  if (!count) {
    throw new Error('Add at least one active pricing plan before publishing this product.');
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const status = request.nextUrl.searchParams.get('status')?.trim() ?? '';
    if (status && !STATUSES.has(status)) {
      return noStoreJson({ error: 'Invalid product status filter.' }, { status: 400 });
    }

    let query = auth.service
      .from('products')
      .select(PRODUCT_COLUMNS)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return noStoreJson({ error: error.message }, { status: 500 });

    return noStoreJson({ products: data ?? [] });
  } catch (error: any) {
    return noStoreJson({ error: error?.message || 'Failed to load products.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return noStoreJson({ error: 'Invalid request body.' }, { status: 400 });
    }

    try {
      const action = String(body.action ?? '');

      if (action === 'save_product') {
        const payload = validateProduct(body);
        const id = cleanText(body.id, 100);

        if (id) {
          if (payload.status === 'active') await assertPublishable(auth.service, id);

          const { data, error } = await auth.service
            .from('products')
            .update(payload)
            .eq('id', id)
            .select(PRODUCT_COLUMNS)
            .single();
          if (error) throw error;
          return noStoreJson({ product: data });
        }

        if (payload.status === 'active') {
          throw new Error('Create the product as a draft, add at least one active pricing plan, then publish it.');
        }

        const { data, error } = await auth.service
          .from('products')
          .insert(payload)
          .select(PRODUCT_COLUMNS)
          .single();
        if (error) throw error;
        return noStoreJson({ product: data }, { status: 201 });
      }

      if (action === 'update_status') {
        const id = cleanText(body.id, 100);
        const status = cleanText(body.status, 20);
        if (!id) throw new Error('Product id is required.');
        if (!STATUSES.has(status)) throw new Error('Invalid product status.');
        if (status === 'active') await assertPublishable(auth.service, id);

        const { data, error } = await auth.service
          .from('products')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select(PRODUCT_COLUMNS)
          .single();
        if (error) throw error;
        return noStoreJson({ product: data });
      }

      return noStoreJson({ error: 'Unknown product action.' }, { status: 400 });
    } catch (error: any) {
      const message = error?.code === '23505'
        ? 'A product with this slug already exists.'
        : error?.message || 'Product update failed.';
      return noStoreJson({ error: message }, { status: 400 });
    }
  } catch (error: any) {
    return noStoreJson({ error: error?.message || 'Product request failed.' }, { status: 500 });
  }
}
