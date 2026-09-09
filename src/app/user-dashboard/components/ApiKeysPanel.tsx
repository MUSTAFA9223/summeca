import React from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';

/**
 * Legacy panel retained for compatibility with older layouts.
 * SUMMECA does not currently expose a production API-key issuance backend, so
 * this component must not show fabricated keys or simulate create/revoke flows.
 */
export default function ApiKeysPanel() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <KeyRound size={18} className="text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-700 text-foreground">API Keys</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            API-key issuance is not enabled for customer accounts yet. No keys are generated or stored from this panel.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-success/5 border border-success/20">
        <ShieldCheck size={14} className="text-success flex-shrink-0 mt-0.5" />
        <p className="text-xs text-secondary-foreground leading-relaxed">
          When this feature is enabled, keys will be created by a server endpoint, shown only once, stored as hashes, and revocable from your account.
        </p>
      </div>
    </div>
  );
}
