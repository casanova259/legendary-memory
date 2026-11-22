import React, { ReactNode, useState } from 'react';
import { AdminSidebar } from '../navigation/AdminSidebar';
import { AdminHeader } from '../navigation/AdminHeader';
import { RoleGuard } from '../navigation/RoleGuard';

export interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen flex bg-gray-50 font-sans">
        {/* Left Sidebar */}
        <AdminSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
          <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
};
