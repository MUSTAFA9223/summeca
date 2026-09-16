'use client';

import React, { createContext, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import CompactLanguageSwitcher from '@/components/CompactLanguageSwitcher';
import { ThemeSwitcher } from '@/components/GlobalThemeSwitcher';
import MarketingCampaignActionsPanel from '@/app/admin/marketing/components/MarketingCampaignActionsPanel';

interface AdminShellProps {
  children: React.ReactNode;
  adminName?: string;
  adminEmail?: string;
}

const AdminShellContext = createContext(false);

export default function AdminShell({
  children,
  adminName = 'Admin',
  adminEmail = '',
}: AdminShellProps) {
  const hasParentAdminShell = useContext(AdminShellContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Some legacy admin pages still wrap themselves in AdminShell even though
  // /admin/layout.tsx already provides the shared shell. Keep nested shells
  // transparent so the header, language/theme controls, sidebar and marketing
  // actions are rendered only once.
  if (hasParentAdminShell) {
    return <>{children}</>;
  }

  return (
    <AdminShellContext.Provider value={true}>
      <div className="min-h-screen bg-background flex">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          adminName={adminName}
          adminEmail={adminEmail}
        />

        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-foreground/30 z-30 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <div
          data-sidebar-offset="admin"
          data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}
        >
          <header
            data-language-switcher-host="true"
            data-theme-switcher-host="true"
            className="h-14 border-b border-border bg-card flex items-center px-4 lg:px-6 gap-3 sticky top-0 z-20"
          >
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              aria-label="Open menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <ThemeSwitcher compact />
              <CompactLanguageSwitcher />
              {adminEmail && <span className="text-xs font-600 text-muted-foreground hidden sm:block" data-ltr>{adminEmail}</span>}
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-700 text-primary">{adminName.charAt(0).toUpperCase()}</span>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8 max-w-screen-2xl w-full">
            {children}
            {pathname === '/admin/marketing' && <MarketingCampaignActionsPanel />}
          </main>
        </div>
      </div>
    </AdminShellContext.Provider>
  );
}
