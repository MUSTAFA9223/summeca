'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardSidebar from './DashboardSidebar';
import DashboardTopbar from './DashboardTopbar';
import LeadFollowEnglishDateTimeInputs from './LeadFollowEnglishDateTimeInputs';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeRoute: string;
}

function DashboardShellSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground" aria-busy="true" aria-label="Loading dashboard">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border bg-card lg:block">
        <div className="h-16 border-b border-border px-4 py-3">
          <div className="h-9 w-32 animate-pulse rounded-xl bg-primary/10" />
        </div>
        <div className="space-y-5 p-4">
          {[0, 1, 2, 3].map((group) => (
            <div key={group} className="space-y-2">
              <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-9 animate-pulse rounded-xl bg-secondary/70" />
              ))}
            </div>
          ))}
        </div>
      </aside>

      <div className="min-h-screen lg:ml-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card px-5 lg:px-8">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-secondary lg:hidden" />
          <div className="hidden h-8 w-72 animate-pulse rounded-lg bg-secondary sm:block" />
          <div className="ml-auto flex gap-2">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-8 w-8 animate-pulse rounded-lg bg-secondary" />
            ))}
          </div>
        </header>
        <main className="w-full max-w-screen-2xl px-5 py-6 lg:px-8 xl:px-10 2xl:px-12">
          <div className="mb-6 space-y-2">
            <div className="h-7 w-52 animate-pulse rounded-lg bg-primary/10" />
            <div className="h-4 w-80 max-w-full animate-pulse rounded bg-secondary" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
            <div className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
          <p className="sr-only" role="status">Loading your dashboard...</p>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children, activeRoute }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/sign-up-login-screen');
    }
  }, [user, loading, router]);

  if (loading) {
    return <DashboardShellSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <div data-summeca-dashboard-shell="true" className="min-h-screen bg-background text-foreground flex">
      {activeRoute === 'leadfollow' && <LeadFollowEnglishDateTimeInputs />}

      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        activeRoute={activeRoute}
      />

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        data-sidebar-offset="dashboard"
        data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        }`}
      >
        <DashboardTopbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 px-5 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-screen-2xl w-full">
          {children}
        </main>
      </div>
    </div>
  );
}