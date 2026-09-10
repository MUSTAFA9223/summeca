const SPLINE_SCENE_URL = 'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode';

export const dynamic = 'force-dynamic';

function copyHeader(source: Headers, target: Headers, name: string) {
  const value = source.get(name);
  if (value) target.set(name, value);
}

export async function GET(request: Request) {
  try {
    const range = request.headers.get('range');
    const headers = new Headers({
      Accept: 'application/octet-stream,*/*',
    });
    if (range) headers.set('Range', range);

    const upstream = await fetch(SPLINE_SCENE_URL, {
      headers,
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!upstream.ok || !upstream.body) {
      return new Response('Spline scene unavailable', {
        status: 502,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const responseHeaders = new Headers();
    copyHeader(upstream.headers, responseHeaders, 'content-type');
    copyHeader(upstream.headers, responseHeaders, 'content-length');
    copyHeader(upstream.headers, responseHeaders, 'content-range');
    copyHeader(upstream.headers, responseHeaders, 'accept-ranges');
    copyHeader(upstream.headers, responseHeaders, 'etag');
    copyHeader(upstream.headers, responseHeaders, 'last-modified');

    if (!responseHeaders.has('content-type')) {
      responseHeaders.set('Content-Type', 'application/octet-stream');
    }
    responseHeaders.set(
      'Cache-Control',
      range
        ? 'public, max-age=600, s-maxage=3600'
        : 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    );

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response('Spline scene unavailable', {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
