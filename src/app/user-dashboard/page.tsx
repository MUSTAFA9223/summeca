import React from 'react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import DashboardOverview from '@/app/user-dashboard/components/DashboardOverview';
import DashboardQuickStart from '@/app/user-dashboard/components/DashboardQuickStart';

export default function UserDashboardPage() {
  return (
    <DashboardLayout activeRoute="dashboard">
      <DashboardQuickStart />
      <DashboardOverview />
    </DashboardLayout>
  );
}
