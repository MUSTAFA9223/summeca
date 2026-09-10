import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const DOWNLOAD_BUCKET = 'downloads';
const SIGNED_URL_SECONDS = 60;
const DB_ASSET_PREFIX = 'dbasset:';

function normalizeObjectPath(value: string): string | null {
  const raw = value.trim();
  if (!raw || /^https?:\/\//i.test(raw) || raw.includes('..') || raw.includes('\\')) {
    return null;
  }

  let path = raw.replace(/^\/+/, '');
  if (path.startsWith(`${DOWNLOAD_BUCKET}/`)) {
    path = path.slice(DOWNLOAD_BUCKET.length + 1);
  }

  return path && !path.startsWith('/') ? path : null;
}

function normalizeAssetKey(value: string): string | null {
  const raw = value.trim();
  if (!raw.startsWith(DB_ASSET_PREFIX)) return null;
  const key = raw.slice(DB_ASSET_PREFIX.length);
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key) ? key : null;
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function downloadDisposition(fileName: string) {
  const safe = fileName.replace(/[\r\n"]/g, '_').trim() || 'download.zip';
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { data: download, error: downloadError } = await supabase
    .from('downloads')
    .select('id, file_name, file_url, status, expires_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (downloadError || !download) {
    return NextResponse.json({ error: 'Download not found.' }, { status: 404 });
  }

  if (download.status !== 'available') {
    return NextResponse.json({ error: 'This download is not available.' }, { status: 410 });
  }

  if (download.expires_at && new Date(download.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'This download has expired.' }, { status: 410 });
  }

  const service = createServiceClient();
  const assetKey = normalizeAssetKey(download.file_url || '');

  if (assetKey) {
    const { data: asset, error: assetError } = await service
      .from('digital_product_assets')
      .select('asset_key, file_name, mime_type, content_base64, is_active')
      .eq('asset_key', assetKey)
      .eq('is_active', true)
      .maybeSingle();

    if (assetError || !asset?.content_base64) {
      console.error('[downloads] Private digital asset is unavailable:', assetKey, assetError?.message);
      return NextResponse.json(
        { error: 'This digital product file is temporarily unavailable. Please contact support.' },
        { status: 503 }
      );
    }

    let bytes: Uint8Array;
    try {
      bytes = decodeBase64(asset.content_base64);
    } catch {
      console.error('[downloads] Private digital asset could not be decoded:', assetKey);
      return NextResponse.json(
        { error: 'This digital product file is temporarily unavailable. Please contact support.' },
        { status: 503 }
      );
    }

    const { data: recorded, error: recordError } = await service.rpc('record_download_access', {
      p_download_id: download.id,
      p_user_id: user.id,
    });

    if (recordError || recorded !== true) {
      console.error('[downloads] Failed to record download access:', recordError?.message);
      return NextResponse.json(
        { error: 'Unable to validate this download. Please refresh and try again.' },
        { status: 409 }
      );
    }

    const fileName = download.file_name || asset.file_name || `${assetKey}.zip`;
    const responseBody = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;

    return new NextResponse(responseBody, {
      status: 200,
      headers: {
        'Content-Type': asset.mime_type || 'application/octet-stream',
        'Content-Disposition': downloadDisposition(fileName),
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'no-store, private',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  const objectPath = normalizeObjectPath(download.file_url || '');
  if (!objectPath) {
    console.error('[downloads] Invalid private object path for download:', download.id);
    return NextResponse.json(
      { error: 'This file is not configured for secure delivery. Please contact support.' },
      { status: 503 }
    );
  }

  const { data: signed, error: signedError } = await service.storage
    .from(DOWNLOAD_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_SECONDS, {
      download: download.file_name || true,
    });

  if (signedError || !signed?.signedUrl) {
    console.error('[downloads] Failed to create signed URL:', signedError?.message);
    return NextResponse.json(
      { error: 'Unable to prepare this download securely. Please try again later.' },
      { status: 503 }
    );
  }

  const { data: recorded, error: recordError } = await service.rpc('record_download_access', {
    p_download_id: download.id,
    p_user_id: user.id,
  });

  if (recordError || recorded !== true) {
    console.error('[downloads] Failed to record download access:', recordError?.message);
    return NextResponse.json(
      { error: 'Unable to validate this download. Please refresh and try again.' },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      url: signed.signedUrl,
      expiresIn: SIGNED_URL_SECONDS,
    },
    {
      headers: {
        'Cache-Control': 'no-store, private',
      },
    }
  );
}
