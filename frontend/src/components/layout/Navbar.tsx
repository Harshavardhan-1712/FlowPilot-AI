'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Workflow as WorkflowIcon, 
  Building2, 
  LogOut, 
  ShieldCheck, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Workspace, User } from '@/lib/types';
import { clearStoredToken, setStoredWorkspaceId } from '@/lib/api';

interface NavbarProps {
  user: User | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onWorkspaceChange?: (ws: Workspace) => void;
}

export function Navbar({ user, workspaces, activeWorkspace, onWorkspaceChange }: NavbarProps) {
  const router = useRouter();

  const handleLogout = () => {
    clearStoredToken();
    router.push('/login');
  };

  const handleSelectWorkspace = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = workspaces.find((w) => w.id === e.target.value);
    if (selected) {
      setStoredWorkspaceId(selected.id);
      if (onWorkspaceChange) onWorkspaceChange(selected);
      window.location.reload();
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 px-6 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-sm shadow-teal-700/20 group-hover:bg-teal-800 transition-colors">
            <WorkflowIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-900 tracking-tight text-base">FlowPilot</span>
              <span className="text-[11px] font-medium tracking-wide text-teal-700 bg-teal-50 border border-teal-200/60 px-1.5 py-0.2 rounded">AI</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono -mt-0.5">Enterprise Platform</p>
          </div>
        </Link>

        {/* Workspace Selector */}
        {workspaces.length > 0 && activeWorkspace && (
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={activeWorkspace.id}
              onChange={handleSelectWorkspace}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Engine Active</span>
        </div>

        <div className="h-5 w-px bg-slate-200 mx-1"></div>

        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-slate-800 leading-tight">
                {user.full_name || user.email.split('@')[0]}
              </div>
              <div className="text-[11px] text-slate-400 font-mono leading-tight">{user.email}</div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
