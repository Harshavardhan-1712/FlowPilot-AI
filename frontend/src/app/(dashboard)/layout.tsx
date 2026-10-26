'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/lib/../components/layout/Navbar';
import { Sidebar } from '@/lib/../components/layout/Sidebar';
import { User, Workspace } from '@/lib/types';
import { api, getStoredToken, getStoredWorkspaceId, setStoredWorkspaceId } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const loadSession = async () => {
      try {
        const data = await api.getMe();
        setUser(data.user);
        setWorkspaces(data.workspaces);

        const storedWsId = getStoredWorkspaceId();
        let currentWs = data.workspaces.find((w) => w.id === storedWsId);
        if (!currentWs && data.workspaces.length > 0) {
          currentWs = data.workspaces[0];
          setStoredWorkspaceId(currentWs.id);
        }
        setActiveWorkspace(currentWs || null);
      } catch (err) {
        console.error('Session verification failed', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono text-slate-500">Initializing FlowPilot Environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar
        user={user}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onWorkspaceChange={(ws) => setActiveWorkspace(ws)}
      />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
