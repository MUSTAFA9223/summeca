'use client';

import React, { useState } from 'react';
import { Key, Eye, EyeOff, Copy, Trash2, Plus, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyMasked: string;
  product: string;
  lastUsed: string;
  createdAt: string;
  status: 'active' | 'revoked';
}

const apiKeys: ApiKey[] = [
  {
    id: 'key-001',
    name: 'Production Integration',
    keyPrefix: 'smc_live',
    keyMasked: 'smc_live_••••••••••••••••••••••••••••••Xk9p',
    product: 'AI Content Generator',
    lastUsed: '2 hours ago',
    createdAt: 'Aug 1, 2026',
    status: 'active',
  },
  {
    id: 'key-002',
    name: 'Dev Environment',
    keyPrefix: 'smc_test',
    keyMasked: 'smc_test_••••••••••••••••••••••••••••••7mQr',
    product: 'AI Content Generator',
    lastUsed: '3 days ago',
    createdAt: 'Jul 20, 2026',
    status: 'active',
  },
];

export default function ApiKeysPanel() {
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const handleCopy = (keyId: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(keyId);
      toast.success('API key copied to clipboard');
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    await new Promise((r) => setTimeout(r, 1200));
    // Backend integration point — replace with API key creation endpoint (hash before storing)
    toast.success(`API key "${newKeyName}" created. Copy it now — it won't be shown again.`);
    setCreatingKey(false);
    setShowCreateModal(false);
    setNewKeyName('');
  };

  const handleRevoke = async (keyId: string) => {
    await new Promise((r) => setTimeout(r, 800));
    // Backend integration point — replace with revoke API key endpoint
    toast.success('API key revoked successfully');
    setConfirmRevoke(null);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-700 text-foreground">API Keys</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage programmatic access to your SUMMECA tools</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 btn-primary text-xs px-3 py-1.5"
        >
          <Plus size={13} />
          New Key
        </button>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning/5 border border-warning/20 mb-5">
        <AlertTriangle size={14} className="text-warning flex-shrink-0 mt-0.5" />
        <p className="text-xs text-secondary-foreground leading-relaxed">
          API keys grant full access to your SUMMECA products. Never share them publicly or commit them to version control. Store them in environment variables.
        </p>
      </div>

      {/* Keys list */}
      {apiKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
            <Key size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-600 text-foreground mb-1">No API keys yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Create an API key to integrate SUMMECA AI tools into your applications and workflows.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="rounded-xl border border-border p-4 hover:border-primary/30 transition-all duration-150">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Key size={14} className="text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-600 text-foreground">{apiKey.name}</div>
                    <div className="text-xs text-muted-foreground">{apiKey.product}</div>
                  </div>
                </div>
                <span className={`text-xs font-600 px-2 py-0.5 rounded-full flex-shrink-0 ${
                  apiKey.status === 'active' ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'
                }`}>
                  {apiKey.status === 'active' ? 'Active' : 'Revoked'}
                </span>
              </div>

              {/* Key value */}
              <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 mb-3">
                <code className="flex-1 text-xs font-mono text-foreground truncate">
                  {revealedKey === apiKey.id ? apiKey.keyMasked.replace(/•+/, 'HIDDEN_FOR_SECURITY') : apiKey.keyMasked}
                </code>
                <button
                  onClick={() => setRevealedKey(revealedKey === apiKey.id ? null : apiKey.id)}
                  className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={revealedKey === apiKey.id ? 'Hide key' : 'Reveal key'}
                >
                  {revealedKey === apiKey.id ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button
                  onClick={() => handleCopy(apiKey.id, apiKey.keyMasked)}
                  className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Copy key"
                >
                  {copiedKey === apiKey.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                </button>
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Created {apiKey.createdAt}</span>
                  <span>Last used {apiKey.lastUsed}</span>
                </div>
                {confirmRevoke === apiKey.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-danger font-600">Revoke this key?</span>
                    <button
                      onClick={() => handleRevoke(apiKey.id)}
                      className="text-xs font-600 text-danger hover:text-danger/80 px-2 py-0.5 rounded-md bg-danger/10 transition-all duration-150"
                    >
                      Yes, revoke
                    </button>
                    <button
                      onClick={() => setConfirmRevoke(null)}
                      className="text-xs font-600 text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md bg-secondary transition-all duration-150"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRevoke(apiKey.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-danger transition-colors"
                  >
                    <Trash2 size={12} />
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create key modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay px-4">
          <div className="bg-card border border-border rounded-2xl shadow-card-lg p-6 w-full max-w-sm fade-in">
            <h3 className="text-base font-700 text-foreground mb-1">Create New API Key</h3>
            <p className="text-xs text-muted-foreground mb-5">
              The key will only be shown once after creation. Store it securely.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="key-name">
                Key name
              </label>
              <p className="text-xs text-muted-foreground mb-2">Give it a descriptive name like "Production App" or "Dev Testing".</p>
              <input
                id="key-name"
                type="text"
                placeholder="e.g. Production Integration"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input text-sm text-foreground placeholder-muted-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              />
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => { setShowCreateModal(false); setNewKeyName(''); }}
                className="flex-1 btn-secondary py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                disabled={!newKeyName.trim() || creatingKey}
                className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {creatingKey ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  'Create Key'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}