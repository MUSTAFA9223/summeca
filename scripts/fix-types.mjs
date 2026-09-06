import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function update(file, transform) {
  if (!fs.existsSync(file)) return false;
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    console.log(`updated ${path.relative(root, file)}`);
    return true;
  }
  return false;
}

// React 19's broad ElementType can produce impossible `never` props for
// dynamic Lucide icon components. Use an intentionally permissive component
// type for configuration-driven icons while preserving normal component types.
for (const file of walk(path.join(root, 'src')).filter((f) => f.endsWith('.tsx'))) {
  update(file, (s) => s.replaceAll('React.ElementType', 'React.ComponentType<any>'));
}

// `output` is Record<string, unknown>; using an unknown value directly as the
// left side of JSX && makes the entire expression unknown | ReactNode.
update(path.join(root, 'src/app/admin/ai/AdminAIClient.tsx'), (s) =>
  s.replace(/\{output\.([A-Za-z0-9_]+) &&/g, '{Boolean(output.$1) &&')
);

// Related products are stored as Product[], so fetch the complete Product shape.
update(path.join(root, 'src/app/products/[slug]/page.tsx'), (s) =>
  s.replace(
    ".select('id, name, slug, short_desc, thumbnail_url, category, tags')",
    ".select('id, name, slug, description, short_desc, category, status, thumbnail_url, demo_url, tags, metadata, created_at')"
  )
);

// Referral status config exposes one combined class string; use it for both
// badge background and inherited icon color rather than nonexistent bg/color keys.
update(path.join(root, 'src/app/user-dashboard/referrals/page.tsx'), (s) =>
  s
    .replace("process.env.NEXT_PUBLIC_SITE_URL || 'https://summeca1430.builtwithrocket.new'", "process.env.NEXT_PUBLIC_SITE_URL || 'https://summeca.com'")
    .replace('${statusCfg.bg}', '${statusCfg.cls}')
    .replace('className={statusCfg.color}', '')
);

// This script is intentionally one-shot. The workflow removes it after it runs.
