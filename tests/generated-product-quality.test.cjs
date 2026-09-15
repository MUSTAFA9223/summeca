const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');

let buildGeneratedDigitalProductBundle;

before(() => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'summeca-generated-kits-'));
  execFileSync(process.execPath, [
    require.resolve('typescript/bin/tsc'),
    'src/lib/digital-products/generatedKits.ts',
    'src/lib/digital-products/generatedWorkbookAssets.ts',
    '--outDir', output,
    '--module', 'commonjs',
    '--target', 'es2022',
    '--lib', 'es2022,dom',
    '--skipLibCheck',
  ]);
  ({ buildGeneratedDigitalProductBundle } = require(path.join(output, 'generatedKits.js')));
});

function unzip(bytes) {
  const buffer = Buffer.from(bytes);
  const files = new Map();
  let offset = 0;
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    assert.equal(flags & 0x08, 0, 'ZIP data descriptors are not supported by this test');
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    const start = offset + 30 + nameLength + extraLength;
    const compressed = buffer.subarray(start, start + compressedSize);
    const content = method === 0 ? compressed : zlib.inflateRawSync(compressed);
    files.set(name, content);
    offset = start + compressedSize;
  }
  return files;
}

function csvRows(buffer) {
  const text = buffer.toString('utf8').replace(/\r\n/g, '\n').trimEnd();
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if (char === '\n' && !quoted) {
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  row.push(cell); rows.push(row);
  return rows;
}

function assertUniqueCsvColumn(files, filename, expectedRows, column) {
  const rows = csvRows(files.get(filename));
  assert.equal(rows.length - 1, expectedRows, `${filename} row count`);
  const values = rows.slice(1).map((row) => row[column]);
  assert.equal(new Set(values).size, expectedRows, `${filename} must not pad its advertised count with duplicates`);
}

test('social kit provides 120 distinct hooks and 80 distinct CTA lines', () => {
  const files = unzip(buildGeneratedDigitalProductBundle('ai-social-media-content-kit'));
  assertUniqueCsvColumn(files, '120_HOOK_LIBRARY.csv', 120, 2);
  assertUniqueCsvColumn(files, '80_CTA_LIBRARY.csv', 80, 2);
});

test('ecommerce kit provides distinct title and benefit templates', () => {
  const files = unzip(buildGeneratedDigitalProductBundle('ecommerce-product-page-conversion-kit'));
  assertUniqueCsvColumn(files, '50_PRODUCT_TITLE_FORMULAS.csv', 50, 1);
  assertUniqueCsvColumn(files, '80_BENEFIT_BULLET_TEMPLATES.csv', 80, 1);
});

test('freelancer kit includes working Excel tools instead of blank CSV shells', () => {
  const files = unzip(buildGeneratedDigitalProductBundle('freelancer-client-management-kit'));
  assert.ok(files.has('CLIENT_PROJECT_TRACKER.xlsx'));
  assert.ok(files.has('INVOICE_TEMPLATE.xlsx'));
  assert.ok(!files.has('CLIENT_PROJECT_TRACKER.csv'));
  assert.ok(!files.has('INVOICE_TEMPLATE.csv'));

  const tracker = unzip(files.get('CLIENT_PROJECT_TRACKER.xlsx'));
  const invoice = unzip(files.get('INVOICE_TEMPLATE.xlsx'));
  const trackerSheet = tracker.get('xl/worksheets/sheet1.xml').toString('utf8');
  const invoiceSheet = invoice.get('xl/worksheets/sheet1.xml').toString('utf8');
  assert.match(trackerSheet, /H5-I5/);
  assert.match(trackerSheet, /COUNTIF/);
  assert.match(invoiceSheet, /B13\*C13\*\(1\+D13\)/);
  assert.match(invoiceSheet, /SUMPRODUCT\(B13:B24,C13:C24\)/);
  assert.match(invoiceSheet, /E29-E30/);
});
