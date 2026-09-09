import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const DOWNLOAD_BUCKET = 'downloads';

type DownloadConfig = {
  bucket: 'downloads';
  path: string;
  name: string;
  size: number;
};

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function normalizeObjectPath(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) || raw.includes('..') || raw.includes('\\')) return null;

  let path = raw.replace(/^\/+/, '');
  if (path.startsWith(`${DOWNLOAD_BUCKET}/`)) path = path.slice(DOWNLOAD_BUCKET.length + 1);
  return path && !path.startsWith('/') ? path : null;
}

function cleanFileName(value: unknown, fallback: string) {
  const cleaned = String(value ?? '').trim().replace(/[\r\n]/g, '').slice(0, 255);
  return cleaned || fallback;
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  return Boolean(origin) && origin === new URL(request.url).origin;
}

function createUploadPath(productId: string, fileName: unknown) {
  const safeName = String(fileName ?? '')
    .normalize('NFKC')
    .replace(/[\r\n]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-180);

  if (!safeName || safeName === '.' || safeName === '..') return null;
  return `products/${productId}/${crypto.randomUUID()}-${safeName}`;
}

async function authenticateAdmin() {
  const session = await createClient();
  const admin = await requireAdmin(session);
  return admin ? { admin, session } : null;
}

async function verifyObject(path: string): Promise<{ size: number } | null> {
  const service = createServiceClient();
  const slash = path.lastIndexOf('/');
  const folder = slash >= 0 ? path.slice(0, slash) : '';
  const file = slash >= 0 ? path.slice(slash + 1) : path;
  if (!file) return null;

  const { data, error } = await service.storage
    .from(DOWNLOAD_BUCKET)
    .list(folder, { limit: 100, search: file });

  if (error) throw new Error(`Could not verify private storage object: ${error.message}`);
  const match = (data ?? []).find((item) => item.name === file);
  if (!match) return null;

  const metadata = (match.metadata ?? {}) as Record<string, unknown>;
  const size = Number(metadata.size ?? 0);
  return { size: Number.isFinite(size) && size >= 0 ? size : 0 };
}

async function reconcileProductDownloads(productId: string, config: DownloadConfig) {
  const service = createServiceClient();
  const { data: orders, error: ordersError } = await service
    .from('orders')
    .select('id, user_id, product_id, plan_id, status, product_plans!inner(billing_period)')
    .eq('product_id', productId)
    .eq('status', 'completed')
    .in('product_plans.billing_period', ['one_time', 'lifetime']);

  if (ordersError) throw new Error(`Could not reconcile existing purchases: ${ordersError.message}`);

  let reconciled = 0;
  for (const order of orders ?? []) {
    const { data: existing, error: existingError } = await service
      .from('downloads')
      .select('id, file_url, status')
      .eq('order_id', order.id)
      .maybeSingle();

    if (existingError) throw new Error(`Could not inspect download entitlement: ${existingError.message}`);

    if (existing) {
      const needsRepair = !String(existing.file_url ?? '').trim() || existing.status !== 'available';
      if (!needsRepair) continue;

      const { error } = await service
        .from('downloads')
        .update({
          file_name: config.name,
          file_url: config.path,
          file_size: config.size,
          status: 'available',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) throw new Error(`Could not repair download entitlement: ${error.message}`);
      reconciled += 1;
      continue;
    }

    const { error } = await service.from('downloads').insert({
      user_id: order.user_id,
      product_id: order.product_id,
      order_id: order.id,
      file_name: config.name,
      file_url: config.path,
      file_size: config.size,
      status: 'available',
      download_count: 0,
    });
    if (error && error.code !== '23505') {
      throw new Error(`Could not create missing download entitlement: ${error.message}`);
    }
    reconciled += 1;
  }

  return reconciled;
}

export async function GET() {
  try {
    const auth = await authenticateAdmin();
    if (!auth) return noStoreJson({ error: 'Admin access required.' }, { status: 403 });

    const { data, error } = await auth.session
      .from('products')
      .select('id, name, slug, status, metadata')
      .order('name');

    if (error) return noStoreJson({ error: 'Could not load product delivery configuration.' }, { status: 500 });

    return noStoreJson({
      products: (data ?? []).map((product) => {
        const metadata = (product.metadata ?? {}) as Record<string, unknown>;
        const download = metadata.download && typeof metadata.download === 'object'
          ? metadata.download as Record<string, unknown>
          : null;
        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          status: product.status,
          download: download
            ? {
                bucket: String(download.bucket ?? DOWNLOAD_BUCKET),
                path: String(download.path ?? ''),
                name: String(download.name ?? ''),
                size: Number(download.size ?? 0),
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error('[admin/entitlements/config] GET failed:', error);
    return noStoreJson({ error: 'Could not load delivery configuration.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return noStoreJson({ error: 'Cross-site request rejected.' }, { status: 403 });
    }

    const auth = await authenticateAdmin();
    if (!auth) return noStoreJson({ error: 'Admin access required.' }, { status: 403 });

    let body: { productId?: string; fileName?: string };
    try {
      body = await request.json();
    } catch {
      return noStoreJson({ error: 'Invalid request body.' }, { status: 400 });
    }

    const productId = String(body.productId ?? '').trim();
    const path = createUploadPath(productId, body.fileName);
    if (!productId || !path) {
      return noStoreJson({ error: 'A product and valid filename are required.' }, { status: 400 });
    }

    const { data: product, error: productError } = await auth.session
      .from('products')
      .select('id')
      .eq('id', productId)
      .maybeSingle();

    if (productError) return noStoreJson({ error: 'Could not validate product.' }, { status: 500 });
    if (!product) return noStoreJson({ error: 'Product not found.' }, { status: 404 });

    const service = createServiceClient();
    const { data, error } = await service.storage
      .from(DOWNLOAD_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data?.token) {
      console.error('[admin/entitlements/config] Signed upload creation failed:', error?.message);
      return noStoreJson({ error: 'Could not prepare a secure upload.' }, { status: 503 });
    }

    return noStoreJson({ path, token: data.token });
  } catch (error) {
    console.error('[admin/entitlements/config] POST failed:', error);
    return noStoreJson({ error: 'Could not prepare a secure upload.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return noStoreJson({ error: 'Cross-site request rejected.' }, { status: 403 });
    }

    const auth = await authenticateAdmin();
    if (!auth) return noStoreJson({ error: 'Admin access required.' }, { status: 403 });

    let body: { productId?: string; path?: string; name?: string; remove?: boolean };
    try {
      body = await request.json();
    } catch {
      return noStoreJson({ error: 'Invalid request body.' }, { status: 400 });
    }

    const productId = String(body.productId ?? '').trim();
    if (!productId) return noStoreJson({ error: 'Product id is required.' }, { status: 400 });

    const { data: product, error: productError } = await auth.session
      .from('products')
      .select('id, metadata')
      .eq('id', productId)
      .maybeSingle();

    if (productError) return noStoreJson({ error: 'Could not load product.' }, { status: 500 });
    if (!product) return noStoreJson({ error: 'Product not found.' }, { status: 404 });

    const metadata = { ...((product.metadata ?? {}) as Record<string, unknown>) };

    if (body.remove === true) {
      delete metadata.download;
      const { error } = await auth.session
        .from('products')
        .update({ metadata, updated_at: new Date().toISOString() })
        .eq('id', productId);
      if (error) return noStoreJson({ error: 'Could not remove download configuration.' }, { status: 500 });
      return noStoreJson({ success: true, download: null });
    }

    const path = normalizeObjectPath(body.path);
    if (!path) {
      return noStoreJson(
        { error: 'Enter a private object path inside the downloads bucket, not a public URL.' },
        { status: 400 }
      );
    }

    const verified = await verifyObject(path);
    if (!verified) {
      return noStoreJson(
        { error: 'That object was not found in the private downloads bucket. Upload it first, then save its object path.' },
        { status: 422 }
      );
    }

    const fallbackName = path.split('/').pop() || 'download';
    const config: DownloadConfig = {
      bucket: DOWNLOAD_BUCKET,
      path,
      name: cleanFileName(body.name, fallbackName),
      size: verified.size,
    };

    metadata.download = config;
    const { error: updateError } = await auth.session
      .from('products')
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq('id', productId);
    if (updateError) return noStoreJson({ error: 'Could not save download configuration.' }, { status: 500 });

    const reconciled = await reconcileProductDownloads(productId, config);
    return noStoreJson({ success: true, download: config, reconciled });
  } catch (error) {
    console.error('[admin/entitlements/config] PUT failed:', error);
    const message = error instanceof Error ? error.message : 'Could not save delivery configuration.';
    return noStoreJson({ error: message }, { status: 500 });
  }
}
