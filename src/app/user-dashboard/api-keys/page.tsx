import React from 'react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import ApiKeysPanel from '@/app/user-dashboard/components/ApiKeysPanel';

export default function ApiKeysPage() {
  return (
    <DashboardLayout activeRoute="api-keys">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-800 text-foreground">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage API access for your SUMMECA account.
          </p>
        </div>

        <ApiKeysPanel />
      </div>
    </DashboardLayout>
  );
}
