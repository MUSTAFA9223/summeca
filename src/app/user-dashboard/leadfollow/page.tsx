'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, CalendarClock, Check, Clipboard, ExternalLink, MessageSquareText, Plus, RefreshCw, Sparkles, Target, Users, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';

type Access = { allowed: boolean; planName: string | null; purchasePath: string; limits: { maxLeads?: number; monthlyAi?: number } };
type Profile = { business_name: string; offer: string; target_audience: string; value_proposition: string; default_tone: string };
type LeadStatus = 'new' | 'contacted' | 'replied' | 'won' | 'lost';
type Lead = { id: string; name: string; company: string; email: string; phone: string; source: string; status: LeadStatus; notes: string; next_follow_up_at: string | null; last_contacted_at: string | null; created_at: string };
type Message = { id: string; lead_id: string; channel: string; stage: string; tone: string; language: string; output_text: string; created_at: string };
type Data = { access: Access; profile: Profile | null; leads: Lead[]; messages: Message[]; counts: { leads: number; due: number; pipeline: Record<string, number> }; usage: { used: number; limit: number; tokens: number; periodStart: string } };
type Metric = [label: string, value: number, icon: LucideIcon];

const emptyProfile: Profile = { business_name: '', offer: '', target_audience: '', value_proposition: '', default_tone: 'professional' };
const statusOptions: LeadStatus[] = ['new', 'contacted', 'replied', 'won', 'lost'];

function localInputDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function LeadFollowPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [forbidden, setForbidden] = useState<Access | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', company: '', email: '', phone: '', source: '', notes: '', nextFollowUpAt: '' });
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [draftForm, setDraftForm] = useState({ channel: 'email', stage: 'follow_up', tone: 'professional', language: 'English', extraContext: '' });
  const [latestDraft, setLatestDraft] = useState('');
  const [followUpValue, setFollowUpValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/leadfollow', { cache: 'no-store' });
      const payload = await response.json();
      if (response.status === 403) {
        setForbidden(payload.access ?? { allowed: false, planName: null, purchasePath: '/products/summeca-leadfollow-ai', limits: {} });
        setData(null); return;
      }
      if (!response.ok) throw new Error(payload.error || 'Unable to load LeadFollow AI.');
      setForbidden(null); setData(payload); setProfile(payload.profile ? { ...emptyProfile, ...payload.profile } : emptyProfile);
      setSelectedLeadId((current) => current || payload.leads?.[0]?.id || '');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load LeadFollow AI.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selectedLead = useMemo(() => data?.leads.find((lead) => lead.id === selectedLeadId) ?? null, [data?.leads, selectedLeadId]);
  const metrics = useMemo<Metric[]>(() => data ? [
    ['Leads', data.counts.leads, Users],
    ['Due now', data.counts.due, CalendarClock],
    ['Contacted', data.counts.pipeline.contacted || 0, MessageSquareText],
    ['Replies', data.counts.pipeline.replied || 0, Target],
    ['Won', data.counts.pipeline.won || 0, Check],
  ] : [], [data]);
  useEffect(() => { setFollowUpValue(localInputDate(selectedLead?.next_follow_up_at ?? null)); }, [selectedLead?.id, selectedLead?.next_follow_up_at]);

  async function post(body: Record<string, unknown>) {
    const response = await fetch('/api/leadfollow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'LeadFollow action failed.');
    return payload;
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      await post({ action: 'save_profile', businessName: profile.business_name, offer: profile.offer, targetAudience: profile.target_audience, valueProposition: profile.value_proposition, defaultTone: profile.default_tone });
      toast.success('Business context saved.'); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save profile.'); }
    finally { setSaving(false); }
  }

  async function createLead(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      const payload = await post({ action: 'create_lead', ...leadForm, nextFollowUpAt: leadForm.nextFollowUpAt || null });
      setLeadForm({ name: '', company: '', email: '', phone: '', source: '', notes: '', nextFollowUpAt: '' }); setShowLeadForm(false); setSelectedLeadId(payload.lead.id);
      toast.success('Lead added.'); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to add lead.'); }
    finally { setSaving(false); }
  }

  async function updateLead(leadId: string, patch: Record<string, unknown>, success: string) {
    try { await post({ action: 'update_lead', leadId, ...patch }); toast.success(success); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update lead.'); }
  }

  async function generateDraft(event: FormEvent) {
    event.preventDefault();
    if (!selectedLeadId) { toast.error('Choose a lead first.'); return; }
    setGenerating(true); setLatestDraft('');
    try {
      const response = await fetch('/api/leadfollow/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: selectedLeadId, ...draftForm }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'AI generation failed.');
      setLatestDraft(payload.output || ''); toast.success('Draft generated and saved to history.'); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'AI generation failed.'); }
    finally { setGenerating(false); }
  }

  async function copyDraft(value = latestDraft) {
    if (!value) return;
    try { await navigator.clipboard.writeText(value); toast.success('Draft copied.'); }
    catch { toast.error('Could not copy the draft.'); }
  }

  if (loading) return <DashboardLayout activeRoute="leadfollow"><div className="flex min-h-[55vh] items-center justify-center"><RefreshCw className="animate-spin text-primary" /></div></DashboardLayout>;

  if (forbidden) return (
    <DashboardLayout activeRoute="leadfollow">
      <div className="mx-auto max-w-3xl py-16 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Bot size={30} /></div><h1 className="mt-6 text-3xl font-black">Unlock LeadFollow AI</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">Purchase a lifetime plan, then manage your leads and create AI-assisted follow-up drafts from your SUMMECA account.</p><Link href={forbidden.purchasePath || '/products/summeca-leadfollow-ai'} className="btn-primary mt-7 inline-flex items-center gap-2 px-6 py-3">View LeadFollow AI plans <ExternalLink size={15}/></Link></div>
    </DashboardLayout>
  );

  if (!data) return <DashboardLayout activeRoute="leadfollow"><div className="p-8 text-center text-muted-foreground">LeadFollow AI could not be loaded.</div></DashboardLayout>;

  return (
    <DashboardLayout activeRoute="leadfollow">
      <div className="space-y-7">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><Sparkles size={15}/> SUMMECA SaaS</div><h1 className="mt-2 text-3xl font-black tracking-tight">LeadFollow AI</h1><p className="mt-2 text-sm text-muted-foreground">Keep every lead organized and turn verified business context into ready-to-edit follow-up drafts.</p></div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-primary/10 px-3 py-2 text-xs font-bold text-primary">{data.access.planName} · Lifetime</span><span className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">AI drafts: {data.usage.used}/{data.usage.limit} this month</span><button onClick={()=>setShowLeadForm((value)=>!value)} className="btn-primary inline-flex items-center gap-2 px-4 py-2"><Plus size={15}/> Add lead</button></div></header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([label, value, Icon])=><div key={label} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon size={18} className="text-primary"/></div><div className="mt-2 text-2xl font-black">{value}</div></div>)}</section>

        {showLeadForm && <section className="rounded-2xl border border-primary/25 bg-card p-6"><div className="flex items-center justify-between"><div><h2 className="font-bold">Add a lead</h2><p className="text-xs text-muted-foreground">Only add information you actually know. AI drafts use these facts as context.</p></div><button onClick={()=>setShowLeadForm(false)} className="text-sm text-muted-foreground">Close</button></div><form onSubmit={createLead} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><input required className="form-input" placeholder="Lead name" value={leadForm.name} onChange={(e)=>setLeadForm({...leadForm,name:e.target.value})}/><input className="form-input" placeholder="Company" value={leadForm.company} onChange={(e)=>setLeadForm({...leadForm,company:e.target.value})}/><input className="form-input" placeholder="Source" value={leadForm.source} onChange={(e)=>setLeadForm({...leadForm,source:e.target.value})}/><input className="form-input" placeholder="Email" value={leadForm.email} onChange={(e)=>setLeadForm({...leadForm,email:e.target.value})}/><input className="form-input" placeholder="Phone" value={leadForm.phone} onChange={(e)=>setLeadForm({...leadForm,phone:e.target.value})}/><input className="form-input" type="datetime-local" value={leadForm.nextFollowUpAt} onChange={(e)=>setLeadForm({...leadForm,nextFollowUpAt:e.target.value})}/><textarea className="form-input sm:col-span-2 lg:col-span-3" placeholder="Factual notes: need, objection, last conversation, requested information..." value={leadForm.notes} onChange={(e)=>setLeadForm({...leadForm,notes:e.target.value})}/><button disabled={saving} className="btn-primary sm:col-span-2 lg:col-span-3 py-2.5">Save lead</button></form></section>}

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <form onSubmit={saveProfile} className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-2"><Target size={18} className="text-primary"/><h2 className="font-bold">Your sales context</h2></div><p className="mt-1 text-xs leading-5 text-muted-foreground">Set this once so drafts stay grounded in your real offer. LeadFollow will not invent missing claims.</p><div className="mt-5 space-y-3"><input className="form-input w-full" placeholder="Business name" value={profile.business_name} onChange={(e)=>setProfile({...profile,business_name:e.target.value})}/><textarea className="form-input w-full" placeholder="What do you sell? Include factual scope and price only if you want it used." value={profile.offer} onChange={(e)=>setProfile({...profile,offer:e.target.value})}/><textarea className="form-input w-full" placeholder="Target audience" value={profile.target_audience} onChange={(e)=>setProfile({...profile,target_audience:e.target.value})}/><textarea className="form-input w-full" placeholder="Value proposition — factual, no invented results" value={profile.value_proposition} onChange={(e)=>setProfile({...profile,value_proposition:e.target.value})}/><select className="form-input w-full" value={profile.default_tone} onChange={(e)=>setProfile({...profile,default_tone:e.target.value})}><option value="professional">Professional</option><option value="friendly">Friendly</option><option value="concise">Concise</option><option value="consultative">Consultative</option></select></div><button disabled={saving} className="btn-primary mt-4 px-5 py-2.5">Save sales context</button></form>

          <form onSubmit={generateDraft} className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] to-card p-6"><div className="flex items-center gap-2"><Bot size={19} className="text-primary"/><h2 className="font-bold">AI follow-up studio</h2></div><p className="mt-1 text-xs text-muted-foreground">Generate a draft, review it, edit as needed, then send it yourself through your normal channel.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><select required className="form-input sm:col-span-2" value={selectedLeadId} onChange={(e)=>setSelectedLeadId(e.target.value)}><option value="">Choose a lead</option>{data.leads.map((lead)=><option key={lead.id} value={lead.id}>{lead.name}{lead.company?` — ${lead.company}`:''}</option>)}</select><select className="form-input" value={draftForm.channel} onChange={(e)=>setDraftForm({...draftForm,channel:e.target.value})}><option value="email">Email</option><option value="linkedin">LinkedIn</option><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="generic">Generic</option></select><select className="form-input" value={draftForm.stage} onChange={(e)=>setDraftForm({...draftForm,stage:e.target.value})}><option value="first_contact">First contact</option><option value="follow_up">Follow-up</option><option value="objection">Objection response</option><option value="close">Close / next step</option><option value="revive">Revive old lead</option></select><select className="form-input" value={draftForm.tone} onChange={(e)=>setDraftForm({...draftForm,tone:e.target.value})}><option>professional</option><option>friendly</option><option>concise</option><option>consultative</option><option>warm</option></select><select className="form-input" value={draftForm.language} onChange={(e)=>setDraftForm({...draftForm,language:e.target.value})}><option>English</option><option>Arabic</option><option>Spanish</option><option>French</option><option>German</option></select><textarea className="form-input sm:col-span-2" placeholder="Additional factual context for this specific message (optional)" value={draftForm.extraContext} onChange={(e)=>setDraftForm({...draftForm,extraContext:e.target.value})}/></div><button disabled={generating || !selectedLeadId || data.usage.used>=data.usage.limit} className="btn-primary mt-4 inline-flex items-center gap-2 px-5 py-2.5 disabled:opacity-50"><Sparkles size={15}/>{generating?'Generating...':'Generate draft'}</button>{latestDraft&&<div className="mt-5 rounded-xl border border-primary/20 bg-background p-4"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-primary">Latest draft</span><button type="button" onClick={()=>copyDraft()} className="inline-flex items-center gap-1 text-xs font-bold text-primary"><Clipboard size={13}/> Copy</button></div><pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-foreground">{latestDraft}</pre></div>}</form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Lead pipeline</h2><p className="mt-1 text-xs text-muted-foreground">{data.counts.leads} / {data.access.limits.maxLeads ?? '—'} plan limit</p></div></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="border-b border-border text-xs uppercase text-muted-foreground"><tr><th className="py-3 pr-4">Lead</th><th className="py-3 pr-4">Source</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4">Next follow-up</th><th className="py-3">Actions</th></tr></thead><tbody>{data.leads.map((lead)=><tr key={lead.id} className={`border-b border-border/60 ${selectedLeadId===lead.id?'bg-primary/[0.03]':''}`}><td className="py-3 pr-4"><button onClick={()=>setSelectedLeadId(lead.id)} className="text-left"><div className="font-semibold">{lead.name}</div><div className="text-xs text-muted-foreground">{lead.company || lead.email || 'No company'}</div></button></td><td className="py-3 pr-4 text-muted-foreground">{lead.source||'—'}</td><td className="py-3 pr-4"><select className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-semibold capitalize" value={lead.status} onChange={(e)=>updateLead(lead.id,{status:e.target.value},'Lead status updated.')} disabled={saving}>{statusOptions.map((status)=><option key={status} value={status}>{status}</option>)}</select></td><td className="py-3 pr-4">{lead.next_follow_up_at?new Date(lead.next_follow_up_at).toLocaleString():'—'}</td><td className="py-3"><div className="flex gap-2"><button onClick={()=>{setSelectedLeadId(lead.id);setDraftForm({...draftForm,stage:'follow_up'});}} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold">Draft follow-up</button>{lead.status!=='won'&&<button onClick={()=>updateLead(lead.id,{status:'won'},'Lead marked won.')} className="rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-bold text-success">Won</button>}</div></td></tr>)}</tbody></table>{!data.leads.length&&<div className="py-12 text-center text-sm text-muted-foreground">Add your first lead to start the pipeline.</div>}</div></section>

        {selectedLead&&<section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]"><div className="rounded-2xl border border-border bg-card p-6"><h2 className="font-bold">Next action · {selectedLead.name}</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{selectedLead.notes||'No notes yet.'}</p><div className="mt-4 flex gap-2"><input type="datetime-local" className="form-input flex-1" value={followUpValue} onChange={(e)=>setFollowUpValue(e.target.value)}/><button onClick={()=>updateLead(selectedLead.id,{nextFollowUpAt:followUpValue||null},'Follow-up schedule saved.')} className="rounded-xl border border-border px-4 text-xs font-bold">Save</button></div><button onClick={()=>updateLead(selectedLead.id,{status:'contacted'},'Lead marked contacted.')} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-primary"><MessageSquareText size={14}/> Mark contacted now</button></div><div className="rounded-2xl border border-border bg-card p-6"><h2 className="font-bold">Recent drafts for this lead</h2><div className="mt-4 space-y-3">{data.messages.filter((message)=>message.lead_id===selectedLead.id).slice(0,6).map((message)=><div key={message.id} className="rounded-xl border border-border p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase text-primary">{message.channel} · {message.stage}</span><button onClick={()=>copyDraft(message.output_text)} className="text-xs font-semibold text-primary">Copy</button></div><p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-6 text-muted-foreground">{message.output_text}</p><p className="mt-2 text-[11px] text-muted-foreground">{new Date(message.created_at).toLocaleString()}</p></div>)}{!data.messages.some((message)=>message.lead_id===selectedLead.id)&&<p className="py-8 text-center text-sm text-muted-foreground">No AI drafts for this lead yet.</p>}</div></div></section>}
      </div>
    </DashboardLayout>
  );
}
