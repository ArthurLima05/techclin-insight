import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useClinic } from '@/contexts/ClinicContext';

const DashboardLayout = () => {
  const { clinic } = useClinic();

  if (!clinic) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 sticky top-0 z-40">
            <SidebarTrigger data-sidebar="trigger" />
          </header>
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;