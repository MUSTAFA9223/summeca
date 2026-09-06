'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Search, Megaphone, BarChart2, Brain, History,
  Loader2, Copy, Check, ChevronDown, ChevronUp, AlertCircle,
  TrendingUp, Zap, FileText, Target
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsageStats {
  requestsUsed: number;
  tokensUsed: number;
  monthlyLimit: number;
  remaining: number;
}

interface GenerationRecord {
  id: string;
  generation_type: string;
  model: string;
  tokens_used: number;
  duration_ms: number;
  created_at: string;
}

type ActiveTab = 'product' | 'seo' | 'campaign' | 'analysis' | 'insights' | 'history';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    </button>
  );
}

function OutputBlock({ label, value }: { label: string; value: string | string[] }) {
  const text = Array.isArray(value) ? value.join('\n') : value;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide">{label}</span>
        <CopyButton text={text} />
      </div>
      {Array.isArray(value) ? (
        <ul className="space-y-1">
          {value.map((v, i) => (
            <li key={i} className="text-sm text-foreground flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{v}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-foreground bg-secondary/40 rounded-lg p-3 whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}

// ─── Product Generator Tab ────────────────────────────────────────────────────

function ProductGeneratorTab({ usage, onGenerated }: { usage: UsageStats | null; onGenerated: () => void }) {
  const [form, setForm] = useState({
    productName: '', category: '', targetAudience: '', mainFeatures: '', price: ''
  });
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleGenerate = async () => {
    if (!form.productName.trim()) { toast.error('Product name is required'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'product_description', input: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setOutput(data.output as Record<string, unknown>);
      onGenerated();
      toast.success('Content generated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'productName', label: 'Product Name *', placeholder: 'e.g. AI Email Writer Pro' },
          { key: 'category', label: 'Category', placeholder: 'e.g. AI Tool, SaaS, Plugin' },
          { key: 'targetAudience', label: 'Target Audience', placeholder: 'e.g. Marketers, Developers' },
          { key: 'price', label: 'Price', placeholder: 'e.g. $29/month' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-600 text-muted-foreground mb-1">{label}</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={placeholder}
              value={form[key as keyof typeof form]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
            />
          </div>
        ))}
        <div className="md:col-span-2">
          <label className="block text-xs font-600 text-muted-foreground mb-1">Main Features</label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder="List the key features of your product..."
            value={form.mainFeatures}
            onChange={e => setForm(p => ({ ...p, mainFeatures: e.target.value }))}
          />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || (usage?.remaining === 0)}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-600 text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? 'Generating...' : 'Generate Content'}
      </button>

      {output && (
        <div className="space-y-4 border border-border rounded-xl p-5 bg-card">
          <div className="flex items-center justify-between">
            <h3 className="font-700 text-sm text-foreground">Generated Content</h3>
            <CopyButton text={JSON.stringify(output, null, 2)} />
          </div>
          {[
            { key: 'title', label: 'Product Title' },
            { key: 'shortDescription', label: 'Short Description' },
            { key: 'seoTitle', label: 'SEO Title' },
            { key: 'metaDescription', label: 'Meta Description' },
            { key: 'socialCaption', label: 'Social Caption' },
          ].map(({ key, label }) =>
            output[key] ? <OutputBlock key={key} label={label} value={output[key] as string} /> : null
          )}
          {['keyBenefits', 'features', 'seoKeywords'].map(key =>
            output[key] ? (
              <OutputBlock key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={output[key] as string[]} />
            ) : null
          )}
          {Boolean(output.faq) && (
            <div>
              <button
                onClick={() => toggle('faq')}
                className="flex items-center gap-2 text-xs font-600 text-muted-foreground uppercase tracking-wide"
              >
                FAQ {expanded.faq ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {expanded.faq && (
                <div className="mt-2 space-y-3">
                  {(output.faq as Array<{ question: string; answer: string }>).map((item, i) => (
                    <div key={i} className="bg-secondary/40 rounded-lg p-3">
                      <p className="text-sm font-600 text-foreground">{item.question}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {Boolean(output.fullDescription) && (
            <div>
              <button
                onClick={() => toggle('desc')}
                className="flex items-center gap-2 text-xs font-600 text-muted-foreground uppercase tracking-wide"
              >
                Full Description {expanded.desc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {expanded.desc && (
                <div
                  className="mt-2 text-sm text-foreground bg-secondary/40 rounded-lg p-3 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: output.fullDescription as string }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SEO Assistant Tab ────────────────────────────────────────────────────────

function SEOAssistantTab({ usage, onGenerated }: { usage: UsageStats | null; onGenerated: () => void }) {
  const [form, setForm] = useState({ productName: '', description: '', category: '' });
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);

  const handleGenerate = async () => {
    if (!form.productName.trim()) { toast.error('Product name is required'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'seo_optimization', input: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setOutput(data.output as Record<string, unknown>);
      onGenerated();
      toast.success('SEO content generated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-600 text-muted-foreground mb-1">Product Name *</label>
          <input className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Product name" value={form.productName}
            onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-600 text-muted-foreground mb-1">Category</label>
          <input className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="e.g. AI Tool" value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-600 text-muted-foreground mb-1">Current Description</label>
          <textarea rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder="Paste your current product description..." value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
      </div>
      <button onClick={handleGenerate} disabled={loading || usage?.remaining === 0}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-600 text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        {loading ? 'Optimizing...' : 'Generate SEO Content'}
      </button>
      {output && (
        <div className="space-y-4 border border-border rounded-xl p-5 bg-card">
          <h3 className="font-700 text-sm text-foreground">SEO Recommendations</h3>
          {['seoTitle', 'metaDescription', 'h1Tag', 'schemaDescription'].map(key =>
            output[key] ? <OutputBlock key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={output[key] as string} /> : null
          )}
          {['keywords', 'contentSuggestions', 'internalLinkSuggestions'].map(key =>
            output[key] ? <OutputBlock key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={output[key] as string[]} /> : null
          )}
        </div>
      )}
    </div>
  );
}

// ─── Campaign Builder Tab ─────────────────────────────────────────────────────

function CampaignBuilderTab({ usage, onGenerated }: { usage: UsageStats | null; onGenerated: () => void }) {
  const [form, setForm] = useState({ productName: '', targetAudience: '', goal: '', budget: '' });
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);

  const handleGenerate = async () => {
    if (!form.productName.trim() || !form.goal.trim()) { toast.error('Product name and goal are required'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'marketing_campaign', input: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setOutput(data.output as Record<string, unknown>);
      onGenerated();
      toast.success('Campaign generated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const socialPosts = output?.socialPosts as Record<string, string> | undefined;
  const adCopy = output?.adCopy as Record<string, string> | undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'productName', label: 'Product Name *', placeholder: 'Product to promote' },
          { key: 'targetAudience', label: 'Target Audience', placeholder: 'Who are you targeting?' },
          { key: 'goal', label: 'Campaign Goal *', placeholder: 'e.g. Drive signups, Increase sales' },
          { key: 'budget', label: 'Budget (optional)', placeholder: 'e.g. $500/month' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-600 text-muted-foreground mb-1">{label}</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={placeholder} value={form[key as keyof typeof form]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
          </div>
        ))}
      </div>
      <button onClick={handleGenerate} disabled={loading || usage?.remaining === 0}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-600 text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
        {loading ? 'Building Campaign...' : 'Build Campaign'}
      </button>
      {output && (
        <div className="space-y-4 border border-border rounded-xl p-5 bg-card">
          <h3 className="font-700 text-sm text-foreground">Marketing Campaign</h3>
          {['campaignName', 'audience', 'marketingAngle', 'emailSubject'].map(key =>
            output[key] ? <OutputBlock key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={output[key] as string} /> : null
          )}
          {Boolean(output.channels) && <OutputBlock label="Recommended Channels" value={output.channels as string[]} />}
          {Boolean(output.kpis) && <OutputBlock label="KPIs to Track" value={output.kpis as string[]} />}
          {socialPosts && (
            <div className="space-y-3">
              <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Social Posts</span>
              {Object.entries(socialPosts).map(([platform, post]) => (
                <OutputBlock key={platform} label={platform.charAt(0).toUpperCase() + platform.slice(1)} value={post} />
              ))}
            </div>
          )}
          {adCopy && (
            <div className="space-y-3">
              <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Ad Copy</span>
              {Object.entries(adCopy).map(([k, v]) => (
                <OutputBlock key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v} />
              ))}
            </div>
          )}
          {Boolean(output.emailBody) && <OutputBlock label="Email Body" value={output.emailBody as string} />}
        </div>
      )}
    </div>
  );
}

// ─── Product Analysis Tab ─────────────────────────────────────────────────────

function ProductAnalysisTab({ usage, onGenerated }: { usage: UsageStats | null; onGenerated: () => void }) {
  const [form, setForm] = useState({ productName: '', views: '', sales: '', refundRate: '', revenue: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);

  const handleGenerate = async () => {
    if (!form.productName.trim()) { toast.error('Product name is required'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'product_analysis',
          input: {
            productName: form.productName,
            views: parseInt(form.views) || 0,
            sales: parseInt(form.sales) || 0,
            refundRate: parseFloat(form.refundRate) || 0,
            revenue: parseFloat(form.revenue) || 0,
            description: form.description,
          }
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setOutput(data.output as Record<string, unknown>);
      onGenerated();
      toast.success('Analysis complete!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const score = output?.overallScore as number | undefined;
  const recommendations = output?.recommendations as Array<{ area: string; suggestion: string; priority: string }> | undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="col-span-2 md:col-span-3">
          <label className="block text-xs font-600 text-muted-foreground mb-1">Product Name *</label>
          <input className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Product name" value={form.productName}
            onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} />
        </div>
        {[
          { key: 'views', label: 'Total Views', placeholder: '1000' },
          { key: 'sales', label: 'Total Sales', placeholder: '50' },
          { key: 'refundRate', label: 'Refund Rate %', placeholder: '5' },
          { key: 'revenue', label: 'Total Revenue $', placeholder: '2500' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-600 text-muted-foreground mb-1">{label}</label>
            <input type="number" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={placeholder} value={form[key as keyof typeof form]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
          </div>
        ))}
        <div className="col-span-2 md:col-span-3">
          <label className="block text-xs font-600 text-muted-foreground mb-1">Product Description</label>
          <textarea rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder="Brief product description..." value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
      </div>
      <button onClick={handleGenerate} disabled={loading || usage?.remaining === 0}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-600 text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <BarChart2 size={16} />}
        {loading ? 'Analyzing...' : 'Analyze Product'}
      </button>
      {output && (
        <div className="space-y-4 border border-border rounded-xl p-5 bg-card">
          {score !== undefined && (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-primary flex items-center justify-center">
                <span className="text-xl font-800 text-primary">{score}</span>
              </div>
              <div>
                <p className="font-700 text-sm text-foreground">Performance Score</p>
                <p className="text-xs text-muted-foreground">{output.performanceSummary as string}</p>
              </div>
            </div>
          )}
          {Boolean(output.strengths) && <OutputBlock label="Strengths" value={output.strengths as string[]} />}
          {Boolean(output.weaknesses) && <OutputBlock label="Weaknesses" value={output.weaknesses as string[]} />}
          {recommendations && (
            <div className="space-y-2">
              <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Recommendations</span>
              {recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-3 bg-secondary/40 rounded-lg p-3">
                  <span className={`text-xs font-700 px-2 py-0.5 rounded-full mt-0.5 ${
                    r.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                    r.priority === 'medium' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                  }`}>{r.priority}</span>
                  <div>
                    <p className="text-sm font-600 text-foreground">{r.area}</p>
                    <p className="text-sm text-muted-foreground">{r.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {Boolean(output.pricingInsight) && <OutputBlock label="Pricing Insight" value={output.pricingInsight as string} />}
          {Boolean(output.ctaImprovement) && <OutputBlock label="CTA Improvement" value={output.ctaImprovement as string} />}
        </div>
      )}
    </div>
  );
}

// ─── Customer Insights Tab ────────────────────────────────────────────────────

function CustomerInsightsTab({ usage, onGenerated }: { usage: UsageStats | null; onGenerated: () => void }) {
  const [form, setForm] = useState({ totalRevenue: '', totalOrders: '', activeSubscriptions: '', refundRate: '' });
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'customer_insights',
          input: {
            topProducts: [],
            totalRevenue: parseFloat(form.totalRevenue) || 0,
            totalOrders: parseInt(form.totalOrders) || 0,
            activeSubscriptions: parseInt(form.activeSubscriptions) || 0,
            refundRate: parseFloat(form.refundRate) || 0,
          }
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setOutput(data.output as Record<string, unknown>);
      onGenerated();
      toast.success('Insights generated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const recommendations = output?.recommendations as Array<{ title: string; description: string; impact: string }> | undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {[
          { key: 'totalRevenue', label: 'Total Revenue $', placeholder: '50000' },
          { key: 'totalOrders', label: 'Total Orders', placeholder: '500' },
          { key: 'activeSubscriptions', label: 'Active Subscriptions', placeholder: '120' },
          { key: 'refundRate', label: 'Refund Rate %', placeholder: '3.5' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-600 text-muted-foreground mb-1">{label}</label>
            <input type="number" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={placeholder} value={form[key as keyof typeof form]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
          </div>
        ))}
      </div>
      <button onClick={handleGenerate} disabled={loading || usage?.remaining === 0}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-600 text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
        {loading ? 'Analyzing...' : 'Generate Insights'}
      </button>
      {output && (
        <div className="space-y-4 border border-border rounded-xl p-5 bg-card">
          {output.businessHealthScore !== undefined && (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-success flex items-center justify-center">
                <span className="text-xl font-800 text-success">{output.businessHealthScore as number}</span>
              </div>
              <div>
                <p className="font-700 text-sm text-foreground">Business Health Score</p>
                <p className="text-xs text-muted-foreground">{output.summary as string}</p>
              </div>
            </div>
          )}
          {Boolean(output.revenueInsights) && <OutputBlock label="Revenue Insights" value={output.revenueInsights as string[]} />}
          {Boolean(output.growthOpportunities) && <OutputBlock label="Growth Opportunities" value={output.growthOpportunities as string[]} />}
          {Boolean(output.riskFactors) && <OutputBlock label="Risk Factors" value={output.riskFactors as string[]} />}
          {recommendations && (
            <div className="space-y-2">
              <span className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Strategic Recommendations</span>
              {recommendations.map((r, i) => (
                <div key={i} className="bg-secondary/40 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-600 text-foreground">{r.title}</p>
                    <span className={`text-xs font-700 px-2 py-0.5 rounded-full ${
                      r.impact === 'high' ? 'bg-primary/10 text-primary' :
                      r.impact === 'medium' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'
                    }`}>{r.impact} impact</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                </div>
              ))}
            </div>
          )}
          {Boolean(output.nextSteps) && <OutputBlock label="Next Steps" value={output.nextSteps as string[]} />}
        </div>
      )}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab() {
  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai/history?all=true')
      .then(r => r.json())
      .then(d => { setGenerations(d.generations ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const TYPE_LABELS: Record<string, string> = {
    product_description: 'Product Content',
    seo_optimization: 'SEO',
    marketing_campaign: 'Campaign',
    product_analysis: 'Analysis',
    customer_insights: 'Insights',
    store_assistant: 'Store Chat',
    email_campaign: 'Email',
    social_post: 'Social',
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={24} className="animate-spin text-primary" />
    </div>
  );

  if (generations.length === 0) return (
    <div className="text-center py-12 text-muted-foreground">
      <History size={32} className="mx-auto mb-3 opacity-40" />
      <p className="text-sm">No generations yet. Start generating content above.</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {generations.map(g => (
        <div key={g.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xs font-600 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {TYPE_LABELS[g.generation_type] ?? g.generation_type}
            </span>
            <span className="text-xs text-muted-foreground">{g.model}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{g.tokens_used} tokens</span>
            <span>{g.duration_ms}ms</span>
            <span>{new Date(g.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Admin AI Page ───────────────────────────────────────────────────────

export default function AdminAIClient() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('product');
  const [usage, setUsage] = useState<UsageStats | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/history');
      const data = await res.json();
      if (data.usage) setUsage(data.usage);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  const tabs: { id: ActiveTab; label: string; icon: React.ComponentType<any>; description: string }[] = [
    { id: 'product', label: 'Product Generator', icon: FileText, description: 'Generate titles, descriptions, SEO & social content' },
    { id: 'seo', label: 'SEO Assistant', icon: Search, description: 'Optimize metadata, keywords & schema' },
    { id: 'campaign', label: 'Campaign Builder', icon: Megaphone, description: 'Create email, social & ad campaigns' },
    { id: 'analysis', label: 'Product Analysis', icon: TrendingUp, description: 'Analyze performance & get recommendations' },
    { id: 'insights', label: 'Business Insights', icon: Brain, description: 'AI-powered business intelligence' },
    { id: 'history', label: 'History', icon: History, description: 'View all AI generations' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-800 text-foreground flex items-center gap-2">
            <Sparkles size={24} className="text-primary" />
            AI Marketing Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Powered by OpenAI — generate content, optimize SEO, build campaigns
          </p>
        </div>
        {usage && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Monthly Usage</div>
            <div className="text-sm font-700 text-foreground">
              {usage.requestsUsed} / {usage.monthlyLimit === 9999 ? '∞' : usage.monthlyLimit}
            </div>
            {usage.monthlyLimit !== 9999 && (
              <div className="w-32 h-1.5 bg-secondary rounded-full mt-1">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (usage.requestsUsed / usage.monthlyLimit) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Usage warning */}
      {usage && usage.remaining === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertCircle size={16} />
          <p className="text-sm font-600">Monthly AI limit reached. Resets at the start of next month.</p>
        </div>
      )}

      {/* Tab navigation */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
              activeTab === tab.id
                ? 'border-primary bg-primary/5 text-primary' :'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
            }`}
          >
            <tab.icon size={18} />
            <span className="text-xs font-600 leading-tight">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab description */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {(() => {
          const t = tabs.find(t => t.id === activeTab);
          return t ? (
            <>
              <Zap size={14} className="text-primary" />
              <span>{t.description}</span>
            </>
          ) : null;
        })()}
      </div>

      {/* Tab content */}
      <div className="bg-card border border-border rounded-2xl p-6">
        {activeTab === 'product' && <ProductGeneratorTab usage={usage} onGenerated={fetchUsage} />}
        {activeTab === 'seo' && <SEOAssistantTab usage={usage} onGenerated={fetchUsage} />}
        {activeTab === 'campaign' && <CampaignBuilderTab usage={usage} onGenerated={fetchUsage} />}
        {activeTab === 'analysis' && <ProductAnalysisTab usage={usage} onGenerated={fetchUsage} />}
        {activeTab === 'insights' && <CustomerInsightsTab usage={usage} onGenerated={fetchUsage} />}
        {activeTab === 'history' && <HistoryTab />}
      </div>

      {/* Security notice */}
      <p className="text-xs text-muted-foreground text-center">
        🔒 All AI calls are processed server-side. API keys are never exposed to the browser.
      </p>
    </div>
  );
}
