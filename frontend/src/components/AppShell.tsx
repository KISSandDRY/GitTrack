'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import LoginScreen from './LoginScreen';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, [pathname]);

  // Exclude auth callback route from shell
  if (pathname?.startsWith('/auth/callback')) {
    return <>{children}</>;
  }

  // Initial loading state
  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-[#0A0A0B]" />;
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Authenticated
  return (
    <div className="flex min-h-screen bg-[#0A0A0B] text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
}
