import { Bot, Check, FileText, LayoutDashboard, ReceiptText } from 'lucide-react';

type ProductProofPreviewProps = {
  name: string;
  variant?: 'card' | 'hero';
  className?: string;
};

type DigitalPreview = {
  label: string;
  files: string[];
  summary: string;
};

function digitalPreview(name: string): DigitalPreview {
  const normalized = name.toLowerCase();
  if (normalized.includes('social media')) {
    return {
      label: 'CONTENT KIT',
      files: ['300 AI prompts.csv', '120 hooks.csv', '30-day planner.csv'],
      summary: 'Prompts, hooks, CTAs and platform frameworks',
    };
  }
  if (normalized.includes('freelancer')) {
    return {
      label: 'CLIENT WORKFLOW KIT',
      files: ['Client intake.txt', 'Proposal template.txt', 'Project tracker.csv'],
      summary: 'Reusable intake, scope, invoice and delivery files',
    };
  }
  if (normalized.includes('ecommerce')) {
    return {
      label: 'ECOMMERCE KIT',
      files: ['100 product prompts.csv', '80 benefit templates.csv', 'QA checklist.txt'],
      summary: 'Copy, SEO, CTA and product-page planning resources',
    };
  }
  if (normalized.includes('ultimate')) {
    return {
      label: 'ULTIMATE KIT',
      files: ['Full audit system', 'Training examples', 'Landing-page template'],
      summary: 'Complete conversion workflow and implementation assets',
    };
  }
  if (normalized.includes('pro')) {
    return {
      label: 'PRO KIT',
      files: ['30-point audit', 'CTA library', 'Follow-up scripts'],
      summary: 'Editable conversion templates and workspace',
    };
  }
  return {
    label: 'STARTER KIT',
    files: ['30-point audit', '20 AI prompts', 'Action planner'],
    summary: 'A focused landing-page review and improvement plan',
  };
}

function PreviewChrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="h-full overflow-hidden rounded-xl border border-slate-700/80 bg-[#111820] shadow-[0_18px_48px_rgba(0,0,0,.35)]">
      <div className="flex items-center justify-between border-b border-slate-700/80 bg-[#18212b] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
        </div>
        <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-400">{title}</span>
        <span className="rounded bg-cyan-300/10 px-1.5 py-0.5 text-[7px] font-bold text-cyan-200">SAMPLE DATA</span>
      </div>
      {children}
    </div>
  );
}

function InvoicePreview({ hero }: { hero: boolean }) {
  return (
    <PreviewChrome title="InvoiceFlow workspace">
      <div className={`grid h-full ${hero ? 'grid-cols-[.55fr_1.45fr]' : 'grid-cols-[.62fr_1.38fr]'}`}>
        <div className="border-r border-slate-700/70 bg-[#0d141b] p-2.5">
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-white">
            <ReceiptText size={11} className="text-cyan-300" /> InvoiceFlow
          </div>
          <div className="mt-3 space-y-1.5 text-[8px] text-slate-500">
            <p className="rounded-md bg-cyan-300/10 px-2 py-1.5 text-cyan-200">Overview</p>
            <p className="px-2 py-1">Invoices</p>
            <p className="px-2 py-1">Clients</p>
          </div>
        </div>
        <div className="p-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[7px] uppercase tracking-wider text-slate-500">Billing overview</p>
              <p className="mt-0.5 text-[10px] font-bold text-white">Recent invoices</p>
            </div>
            <span className="rounded-md bg-cyan-300 px-2 py-1 text-[7px] font-black text-[#062027]">+ New invoice</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {[
              ['DUE', '$1,240'],
              ['PAID', '$860'],
              ['CLIENTS', '12'],
            ].map(([label, value]) => (
              <div key={label} className="border border-slate-700/70 bg-slate-800/45 p-2">
                <p className="text-[6px] font-bold text-slate-500">{label}</p>
                <p className="mt-1 text-[9px] font-black text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-2.5 border border-slate-700/70 bg-slate-900/40">
            {[
              ['INV-1048', 'Northstar Studio', '$1,240'],
              ['INV-1047', 'Demo Client', '$860'],
            ].map((row) => (
              <div key={row[0]} className="grid grid-cols-[.75fr_1.25fr_.55fr] gap-1 border-b border-slate-700/60 px-2 py-1.5 text-[7px] last:border-0">
                <span className="font-bold text-cyan-200">{row[0]}</span>
                <span className="truncate text-slate-400">{row[1]}</span>
                <span className="text-right font-bold text-white">{row[2]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PreviewChrome>
  );
}

function LeadPreview({ hero }: { hero: boolean }) {
  return (
    <PreviewChrome title="LeadFollow AI workspace">
      <div className={`grid h-full ${hero ? 'grid-cols-[.9fr_1.1fr]' : 'grid-cols-2'} gap-2.5 p-2.5`}>
        <div className="border border-slate-700/70 bg-[#0d141b] p-2.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-bold text-white">Lead pipeline</span>
            <span className="text-[7px] text-slate-500">2 leads</span>
          </div>
          <div className="mt-2.5 space-y-2">
            {[
              ['Sample Lead', 'REPLIED'],
              ['Demo Inquiry', 'NEW'],
            ].map(([lead, status]) => (
              <div key={lead} className="border border-slate-700/70 bg-slate-800/45 p-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[8px] font-bold text-white">{lead}</span>
                  <span className="text-[6px] font-bold text-cyan-200">{status}</span>
                </div>
                <p className="mt-1 text-[7px] text-slate-500">Next action scheduled</p>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-cyan-300/20 bg-cyan-300/[0.035] p-2.5">
          <div className="flex items-center gap-1.5 text-[8px] font-bold text-cyan-200">
            <Bot size={11} /> AI follow-up draft
          </div>
          <div className="mt-2.5 border border-slate-700/70 bg-[#0d141b] p-2.5">
            <p className="text-[7px] leading-3.5 text-slate-400">
              Hi Sample Lead, I’m following up on the workflow notes. Would Tuesday work for a short next-step call?
            </p>
          </div>
          <div className="mt-2 flex justify-end">
            <span className="rounded-md border border-cyan-300/20 px-2 py-1 text-[7px] font-bold text-cyan-200">Copy draft</span>
          </div>
        </div>
      </div>
    </PreviewChrome>
  );
}

function DigitalPreview({ name }: { name: string }) {
  const preview = digitalPreview(name);
  return (
    <PreviewChrome title="Protected ZIP contents">
      <div className="grid h-full grid-cols-[.58fr_1.42fr]">
        <div className="flex flex-col justify-between border-r border-slate-700/70 bg-[#0d141b] p-3">
          <div>
            <FileText size={18} className="text-cyan-300" />
            <p className="mt-2 text-[8px] font-black leading-3 text-white">{preview.label}</p>
          </div>
          <span className="text-[7px] leading-3 text-slate-500">Delivered after verified purchase</span>
        </div>
        <div className="p-3">
          <p className="text-[7px] uppercase tracking-wider text-slate-500">Files included</p>
          <div className="mt-2 space-y-1.5">
            {preview.files.map((file) => (
              <div key={file} className="flex items-center gap-1.5 border-b border-slate-700/60 pb-1.5 text-[8px] text-slate-300 last:border-0">
                <Check size={9} className="shrink-0 text-cyan-300" />
                <span className="truncate">{file}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[7px] leading-3 text-slate-500">{preview.summary}</p>
        </div>
      </div>
    </PreviewChrome>
  );
}

export default function ProductProofPreview({ name, variant = 'card', className = '' }: ProductProofPreviewProps) {
  const normalized = name.toLowerCase();
  const hero = variant === 'hero';
  const content = normalized.includes('invoiceflow')
    ? <InvoicePreview hero={hero} />
    : normalized.includes('leadfollow')
      ? <LeadPreview hero={hero} />
      : <DigitalPreview name={name} />;

  return (
    <div className={`${hero ? 'h-[360px] sm:h-[430px]' : 'h-[180px]'} ${className}`} data-product-proof-preview="true">
      {content}
    </div>
  );
}

export function WorkspaceOverviewPreview({ className = '' }: { className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-700/80 bg-[#10171f] shadow-[0_28px_80px_rgba(0,0,0,.42)] ${className}`} data-workspace-preview="true">
      <div className="flex items-center justify-between border-b border-slate-700/80 bg-[#17212b] px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <LayoutDashboard size={14} className="text-cyan-300" /> SUMMECA Workspace
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-200">ACTUAL PRODUCT PREVIEW</span>
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
        <ProductProofPreview name="SUMMECA InvoiceFlow" variant="card" />
        <ProductProofPreview name="SUMMECA LeadFollow AI" variant="card" />
      </div>
    </div>
  );
}
