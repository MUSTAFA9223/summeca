import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const DOWNLOAD_BUCKET = 'downloads';
const SIGNED_URL_SECONDS = 60;

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

  const objectPath = normalizeObjectPath(download.file_url || '');
  if (!objectPath) {
    console.error('[downloads] Invalid private object path for download:', download.id);
    return NextResponse.json(
      { error: 'This file is not configured for secure delivery. Please contact support.' },
      { status: 503 }
    );
  }

  const service = createServiceClient();
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
