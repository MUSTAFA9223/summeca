'use client';

import React, { useState } from 'react';
import { Download, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const downloads = [
  {
    id: 'dl-001',
    product: 'Teacher Planner 2026',
    fileName: 'teacher-planner-2026-v1.2.pdf',
    fileSize: '4.8 MB',
    format: 'PDF',
    purchasedOn: 'Jul 15, 2026',
    downloadCount: 2,
    maxDownloads: null,
    isNew: false,
  },
  {
    id: 'dl-002',
    product: 'Business Template Pack',
    fileName: 'business-templates-v3.zip',
    fileSize: '12.3 MB',
    format: 'ZIP',
    purchasedOn: 'Jun 3, 2026',
    downloadCount: 1,
    maxDownloads: null,
    isNew: true,
  },
];

export default function DownloadsPanel() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (id: string, fileName: string) => {
    setDownloading(id);
    await new Promise((r) => setTimeout(r, 1800));
    // Backend integration point — replace with signed URL generation from Supabase Storage
    toast.success(`${fileName} download started`);
    setDownloading(null);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-700 text-foreground">Downloads</h3>
        <span className="text-xs text-primary font-600 cursor-pointer hover:text-primary/80 transition-colors">
          All downloads →
        </span>
      </div>

      {downloads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
            <Download size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-600 text-foreground mb-1">No downloads yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Purchase digital products to access secure downloads from your account.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {downloads.map((dl) => (
            <div key={dl.id} className="rounded-xl border border-border p-3.5 hover:border-primary/30 transition-all duration-150">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-700 text-foreground">{dl.product}</span>
                    {dl.isNew && (
                      <span className="text-xs font-600 px-1.5 py-0.5 rounded-full bg-success/10 text-success">New</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono truncate block">{dl.fileName}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span>{dl.format} · {dl.fileSize}</span>
                <div className="flex items-center gap-1">
                  <CheckCircle size={11} className="text-success" />
                  <span>{dl.downloadCount} download{dl.downloadCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <button
                onClick={() => handleDownload(dl.id, dl.fileName)}
                disabled={downloading === dl.id}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 text-primary text-xs font-600 hover:bg-primary/20 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {downloading === dl.id ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Generating secure link...
                  </>
                ) : (
                  <>
                    <Download size={12} />
                    Download File
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}