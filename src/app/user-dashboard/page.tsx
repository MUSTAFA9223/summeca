import React from 'react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import DashboardOverview from '@/app/user-dashboard/components/DashboardOverview';

export default function UserDashboardPage() {
  return (
    <DashboardLayout activeRoute="dashboard">
      <DashboardOverview />
    </DashboardLayout>
  );
}