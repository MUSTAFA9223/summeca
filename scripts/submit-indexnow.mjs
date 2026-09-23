const SITE_ORIGIN = 'https://summeca.com';
const INDEXNOW_KEY = '7f4b9d13c6e24a8f95b0d3e72c1a6f48';
const KEY_LOCATION = `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

function decodeXmlUrl(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'SUMMECA-IndexNow/1.0' },
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

const keyBody = (await fetchText(KEY_LOCATION)).trim();
if (keyBody !== INDEXNOW_KEY) {
  throw new Error('IndexNow key verification file does not match the configured key.');
}

const sitemapXml = await fetchText(`${SITE_ORIGIN}/sitemap.xml`);
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((match) => decodeXmlUrl(match[1].trim()))
  .filter((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'summeca.com';
    } catch {
      return false;
    }
  });

const priorityUrls = [
  SITE_ORIGIN + '/',
  SITE_ORIGIN + '/products',
  SITE_ORIGIN + '/products/summeca-siteagent-ai',
  SITE_ORIGIN + '/products/summeca-leadfollow-ai',
  SITE_ORIGIN + '/products/summeca-proposalflow-ai',
  SITE_ORIGIN + '/products/summeca-invoiceflow',
  SITE_ORIGIN + '/pricing',
];

const urlList = [...new Set([...priorityUrls, ...sitemapUrls])];
if (!urlList.length) throw new Error('No public URLs were discovered for IndexNow submission.');

for (let offset = 0; offset < urlList.length; offset += 10000) {
  const batch = urlList.slice(offset, offset + 10000);
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: 'summeca.com',
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList: batch,
    }),
  });
  const body = await response.text();
  console.log(`IndexNow batch ${offset / 10000 + 1}: HTTP ${response.status}; URLs=${batch.length}`);
  if (!response.ok) {
    throw new Error(`IndexNow rejected the submission: HTTP ${response.status} ${body.slice(0, 500)}`);
  }
}
