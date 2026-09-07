import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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
    return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  }

  const service = createServiceClient();
  const { data: profile, error: profileError } = await service
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) };
  }

  return { service };
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

export async function GET(request: NextRequest) {
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
}

export async function POST(request: NextRequest) {
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
        const { data, error } = await auth.service
          .from('products')
          .update(payload)
          .eq('id', id)
          .select(PRODUCT_COLUMNS)
          .single();
        if (error) throw error;
        return noStoreJson({ product: data });
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
}
