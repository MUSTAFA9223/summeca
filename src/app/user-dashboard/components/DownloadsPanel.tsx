import React from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';

/**
 * Legacy dashboard card retained for compatibility with older layouts.
 * The previous implementation showed fabricated downloads and simulated a
 * successful download. Real downloads are served by the protected downloads
 * page and /api/downloads/[id] signed-URL flow.
 */
export default function DownloadsPanel() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-700 text-foreground">Downloads</h3>
        <Link
          href="/user-dashboard/downloads"
          className="text-xs text-primary font-600 hover:text-primary/80 transition-colors"
        >
          All downloads →
        </Link>
      </div>

      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
          <Download size={20} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-600 text-foreground">Your secure files are account-specific</p>
        <p className="text-xs text-muted-foreground max-w-sm mt-1">
          Open the downloads page to see only files granted by completed purchases or active entitlements.
        </p>
        <Link href="/user-dashboard/downloads" className="btn-secondary text-xs px-3 py-2 mt-4">
          View downloads
        </Link>
      </div>
    </div>
  );
}
