const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const migration = fs.readFileSync('supabase/migrations/20260919121500_siteagent_ai.sql', 'utf8');
const access = fs.readFileSync('src/lib/saas/access.ts', 'utf8');
const settingsApi = fs.readFileSync('src/app/api/siteagent/route.ts', 'utf8');
const chatApi = fs.readFileSync('src/app/api/siteagent/chat/route.ts', 'utf8');
const dashboard = fs.readFileSync('src/app/user-dashboard/siteagent/page.tsx', 'utf8');
const widget = fs.readFileSync('public/siteagent-widget.js', 'utf8');
const sidebar = fs.readFileSync('src/app/user-dashboard/components/DashboardSidebar.tsx', 'utf8');
const catalog = fs.readFileSync('src/lib/catalog/publicCatalog.ts', 'utf8');
const productPage = fs.readFileSync('src/app/products/[slug]/page.tsx', 'utf8');

test('SiteAgent private data stays behind trusted server code', () => {
  for (const table of [
    'siteagent_agents',
    'siteagent_conversations',
    'siteagent_messages',
    'siteagent_usage',
  ]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, 'i'));
    assert.match(migration, new RegExp(`grant all on table public\\.${table} to service_role`, 'i'));
  }
});

test('SiteAgent product and plans are seeded without changing payment providers', () => {
  assert.match(migration, /SUMMECA SiteAgent AI/);
  assert.match(migration, /summeca-siteagent-ai/);
  assert.match(migration, /39::numeric/);
  assert.match(migration, /79::numeric/);
  assert.match(migration, /129::numeric/);
  assert.match(migration, /'lifetime'::plan_billing_period/);
  assert.match(migration, /SiteAgent AI → LeadFollow AI → ProposalFlow AI → InvoiceFlow/);
});

test('SiteAgent exposes bounded free and paid usage through the existing SaaS access layer', () => {
  assert.match(access, /summeca-siteagent-ai/);
  assert.match(access, /monthlySiteAgentReplies: 25/);
  assert.match(access, /monthlySiteAgentReplies: 250/);
  assert.match(access, /monthlySiteAgentReplies: 1000/);
  assert.match(access, /monthlySiteAgentReplies: 3000/);
  assert.match(access, /maxKnowledgeChars/);
  assert.match(access, /maxSiteAgentDomains/);
});

test('SiteAgent owner settings API authenticates and enforces plan limits', () => {
  assert.match(settingsApi, /auth\.getUser\(\)/);
  assert.match(settingsApi, /getSaasAccess\(user\.id, PRODUCT_SLUG\)/);
  assert.match(settingsApi, /maxKnowledgeChars/);
  assert.match(settingsApi, /maxSiteAgentDomains/);
  assert.match(settingsApi, /checkRateLimit/);
  assert.match(settingsApi, /allowed_domains/);
});

test('public SiteAgent chat is grounded, rate limited, domain restricted and quota controlled', () => {
  assert.match(chatApi, /checkRateLimit/);
  assert.match(chatApi, /hostAllowed/);
  assert.match(chatApi, /allowed_domains/);
  assert.match(chatApi, /reserve_siteagent_ai_request/);
  assert.match(chatApi, /release_siteagent_ai_request/);
  assert.match(chatApi, /Answer only from the verified business knowledge above/);
  assert.match(chatApi, /Never invent prices, policies, availability, discounts, features, results, testimonials, guarantees/);
  assert.match(chatApi, /generateText\(/);
});

test('SiteAgent captures leads through LeadFollow without bypassing LeadFollow limits', () => {
  assert.match(chatApi, /getSaasAccess\(input\.ownerId, 'summeca-leadfollow-ai'\)/);
  assert.match(chatApi, /maxLeads/);
  assert.match(chatApi, /from\('leadfollow_leads'\)/);
  assert.match(chatApi, /source: 'SiteAgent AI'/);
  assert.match(chatApi, /lead_limit_reached/);
});

test('SiteAgent widget and dashboard expose a real installable workflow', () => {
  assert.match(widget, /data-agent-key/);
  assert.match(widget, /\/api\/siteagent\/chat/);
  assert.match(widget, /localStorage/);
  assert.match(dashboard, /Install on your website/);
  assert.match(dashboard, /Copy embed code/);
  assert.match(dashboard, /LeadFollow → ProposalFlow → InvoiceFlow/);
  assert.match(sidebar, /\/user-dashboard\/siteagent/);
});

test('SiteAgent is published through the focused catalog and generic SaaS entitlement page', () => {
  assert.match(catalog, /summeca-siteagent-ai/);
  assert.match(productPage, /summeca-siteagent-ai/);
  assert.match(productPage, /\/user-dashboard\/siteagent/);
  assert.match(productPage, /Get SiteAgent AI/);
});
