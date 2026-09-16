'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Eye, Loader2, Megaphone, Send, X } from 'lucide-react';

type Campaign = {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  subject: string | null;
  content: string | null;
  target_type: string;
  created_at: string;
};

type CampaignContent = {
  headline?: string;
  subheadline?: string;
  emailSubject?: string;
  emailPreview?: string;
  emailBody?: string;
  cta?: string;
  socialPosts?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
};

function parseCampaignContent(value: string | null): CampaignContent {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as CampaignContent) : {};
  } catch {
    return {};
  }
}

function htmlToPlainText(value: string | undefined): string {
  if (!value) return '';
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote)\s*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function MarketingCampaignActionsPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadDrafts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/marketing/campaigns?status=draft', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDrafts();
  }, []);

  const preview = useMemo(
    () => (previewCampaign ? parseCampaignContent(previewCampaign.content) : null),
    [previewCampaign],
  );

  const sendCampaign = async (campaign: Campaign) => {
    const approved = window.confirm(
      `Send “${campaign.name}” now? Only users who explicitly opted in to marketing email will be contacted.`,
    );
    if (!approved) return;

    setSendingId(campaign.id);
    setResult(null);
    try {
      const response = await fetch('/api/admin/marketing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaign.id, segment: campaign.target_type }),
      });
      const data = await response.json();
      if (!response.ok) {
        setResult({ success: false, message: data.error ?? 'Campaign send failed.' });
        return;
      }

      const sent = Number(data.sent ?? 0);
      const optedIn = Number(data.optedIn ?? sent);
      const total = Number(data.total ?? optedIn);
      setResult({
        success: true,
        message: `Campaign completed: ${sent} sent · ${optedIn} opted in · ${total} profiles checked.`,
      });
      setCampaigns((current) => current.filter((item) => item.id !== campaign.id));
      if (previewCampaign?.id === campaign.id) setPreviewCampaign(null);
    } catch {
      setResult({ success: false, message: 'Network error while sending the campaign.' });
    } finally {
      setSendingId(null);
    }
  };

  if (loading) {
    return (
      <section className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Loading saved campaign actions…
        </div>
      </section>
    );
  }

  if (campaigns.length === 0 && !result) return null;

  return (
    <>
      <section className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Megaphone size={15} className="text-primary" />
          <h2 className="text-sm font-700 text-foreground">Saved campaign actions</h2>
          <span className="text-xs text-muted-foreground">Review before sending</span>
        </div>

        {result && (
          <div
            className={`mb-3 flex items-center gap-2 rounded-xl border p-3 text-sm ${
              result.success
                ? 'border-teal-200 bg-teal-50 text-teal-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {result.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {result.message}
          </div>
        )}

        <div className="space-y-2">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/30 p-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-600 text-foreground">{campaign.name}</div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {campaign.subject ?? 'No subject'} · {campaign.target_type.replaceAll('_', ' ')}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewCampaign(campaign)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-600 text-foreground hover:bg-secondary"
                >
                  <Eye size={13} /> Preview
                </button>
                <button
                  type="button"
                  onClick={() => void sendCampaign(campaign)}
                  disabled={sendingId === campaign.id}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-600 text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sendingId === campaign.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {sendingId === campaign.id ? 'Sending…' : 'Send Campaign'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {previewCampaign && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-border bg-card p-4">
              <div>
                <div className="text-xs font-600 text-primary">Campaign Preview</div>
                <h3 className="mt-1 text-lg font-700 text-foreground">{previewCampaign.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCampaign(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Close preview"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <div className="mb-1 text-xs font-600 text-muted-foreground">Subject</div>
                <div className="rounded-xl bg-secondary p-3 text-sm font-600 text-foreground">
                  {preview.emailSubject ?? previewCampaign.subject ?? '—'}
                </div>
              </div>

              {preview.emailPreview && (
                <div>
                  <div className="mb-1 text-xs font-600 text-muted-foreground">Preview text</div>
                  <div className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">{preview.emailPreview}</div>
                </div>
              )}

              {preview.emailBody && (
                <div>
                  <div className="mb-1 text-xs font-600 text-muted-foreground">Email body</div>
                  <div className="whitespace-pre-line rounded-xl bg-secondary p-4 text-sm leading-relaxed text-foreground">
                    {htmlToPlainText(preview.emailBody)}
                  </div>
                </div>
              )}

              {preview.cta && (
                <div>
                  <div className="mb-1 text-xs font-600 text-muted-foreground">CTA</div>
                  <span className="inline-flex rounded-lg bg-primary px-4 py-2 text-xs font-700 text-white">{preview.cta}</span>
                </div>
              )}

              {preview.socialPosts && Object.values(preview.socialPosts).some(Boolean) && (
                <div>
                  <div className="mb-2 text-xs font-600 text-muted-foreground">Social copy included</div>
                  <div className="space-y-2">
                    {preview.socialPosts.twitter && <div className="whitespace-pre-line rounded-xl border border-border p-3 text-sm">{preview.socialPosts.twitter}</div>}
                    {preview.socialPosts.linkedin && <div className="whitespace-pre-line rounded-xl border border-border p-3 text-sm">{preview.socialPosts.linkedin}</div>}
                    {preview.socialPosts.instagram && <div className="whitespace-pre-line rounded-xl border border-border p-3 text-sm">{preview.socialPosts.instagram}</div>}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card p-4">
              <button
                type="button"
                onClick={() => setPreviewCampaign(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-600 text-foreground hover:bg-secondary"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void sendCampaign(previewCampaign)}
                disabled={sendingId === previewCampaign.id}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-700 text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {sendingId === previewCampaign.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
