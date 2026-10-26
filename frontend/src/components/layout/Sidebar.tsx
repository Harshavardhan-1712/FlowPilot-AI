'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GitBranch,
  PlayCircle,
  CheckCircle2,
  BookOpen,
  Settings,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { api } from '@/lib/api';

export function Sidebar() {
  const pathname = usePathname();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  useEffect(() => {
    // Poll pending approvals count
    const fetchPending = async () => {
      try {
        const apps = await api.listApprovals('pending');
        setPendingApprovalsCount(apps.length);
      } catch (err) {
        // Silently ignore if not logged in
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    {
      label: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Workflow Library',
      href: '/workflows',
      icon: GitBranch,
    },
    {
      label: 'Executions',
      href: '/executions',
      icon: PlayCircle,
    },
    {
      label: 'Approvals',
      href: '/approvals',
      icon: CheckCircle2,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      label: 'Knowledge Base',
      href: '/knowledge',
      icon: BookOpen,
    },
    {
      label: 'Settings & Audit',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4 shadow-[1px_0_2px_rgba(0,0,0,0.02)]">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Platform Navigation
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 border border-teal-200/80 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Security / Governance Status Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-medium mb-1">
            <ShieldAlert className="w-4 h-4 text-teal-700" />
            <span>Policy & Safety</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Strict tenant isolation, SSRF prevention, and human approval gates are enforced.
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3">
        <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
          <span>FlowPilot Engine</span>
          <span>v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
