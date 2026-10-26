'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GitBranch,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Play,
  RotateCcw
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api';
import { DashboardMetrics, WorkflowExecution, Workflow } from '@/lib/types';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<WorkflowExecution[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [m, execs, wfs] = await Promise.all([
        api.getDashboardMetrics(),
        api.listExecutions(undefined, undefined),
        api.listWorkflows(),
      ]);
      setMetrics(m);
      setRecentExecutions(execs.slice(0, 8));
      setWorkflows(wfs);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleQuickRunDemo = async () => {
    const demoWf = workflows.find((w) => w.name === 'Customer Feedback Intelligence') || workflows[0];
    if (!demoWf) return;
    try {
      await api.executeWorkflow(demoWf.id, {
        ticket_text: 'Billing dispute on Invoice #INV-2026-883. Charged twice for $1,200. Please reverse immediately.'
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to trigger demo workflow', err);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-slate-500 font-mono">Aggregating platform metrics...</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Workflows',
      value: metrics?.total_workflows ?? 0,
      sub: `${metrics?.active_workflows ?? 0} active`,
      icon: GitBranch,
      color: 'text-teal-700 bg-teal-50 border-teal-200',
    },
    {
      label: 'Executions Today',
      value: metrics?.executions_today ?? 0,
      sub: `${metrics?.successful_executions ?? 0} successful runs`,
      icon: PlayCircle,
      color: 'text-sky-700 bg-sky-50 border-sky-200',
    },
    {
      label: 'Pending Approvals',
      value: metrics?.pending_approvals ?? 0,
      sub: 'Action required',
      icon: AlertTriangle,
      color: metrics && metrics.pending_approvals > 0 
        ? 'text-amber-700 bg-amber-50 border-amber-300 ring-2 ring-amber-400/30' 
        : 'text-slate-700 bg-slate-50 border-slate-200',
    },
    {
      label: 'Avg Duration',
      value: `${metrics?.avg_duration_seconds ?? 0}s`,
      sub: `${metrics?.failed_executions ?? 0} failures recorded`,
      icon: Clock,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time execution telemetry, active workflow health, and pending governance gates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            title="Refresh Data"
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleQuickRunDemo}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-medium shadow-sm flex items-center gap-2 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Test-Run Demo Pipeline</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
                <div className={`p-1.5 rounded-md border ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-slate-900">{card.value}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{card.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Chart & Pending Approvals Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly Activity Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Execution Throughput (Past 7 Days)</h2>
              <p className="text-xs text-slate-500">Autonomous workflow runs and pipeline completions</p>
            </div>
            <span className="text-[11px] font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-600">
              Database Aggregated
            </span>
          </div>

          <div className="h-64 w-full">
            {metrics?.activity_timeline && metrics.activity_timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.activity_timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.375rem', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" name="Total Executions" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No execution activity recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Pending Approvals Quick Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span>Human-in-the-Loop Gate</span>
              </h2>
              {metrics && metrics.pending_approvals > 0 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  {metrics.pending_approvals} Pending
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  All Clear
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Sensitive operations (reversals, email drafts, outbound mutations) pause automated execution until reviewed.
            </p>

            {metrics && metrics.pending_approvals > 0 ? (
              <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-2 mb-4">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Execution Paused for Approval</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  A high-priority ticket reversal ($1,200 refund) is awaiting supervisor review.
                </p>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">No Pending Requests</p>
                <p className="text-[11px] text-slate-400">Pipelines are running unblocked.</p>
              </div>
            )}
          </div>

          <Link
            href="/approvals"
            className="w-full py-2 px-3 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors mt-4"
          >
            <span>Open Approval Center</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Recent Executions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Recent Workflow Executions</h2>
            <p className="text-xs text-slate-500">Audit trail of execution states and timings</p>
          </div>
          <Link
            href="/executions"
            className="text-xs font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1"
          >
            <span>View All Runs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentExecutions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No executions found. Trigger a test run above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Workflow</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Trigger</th>
                  <th className="py-2.5 px-4">Duration</th>
                  <th className="py-2.5 px-4">Execution ID</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentExecutions.map((exec) => (
                  <tr key={exec.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {exec.workflow_name || 'Workflow'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          exec.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : exec.status === 'waiting_for_approval'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : exec.status === 'failed'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            exec.status === 'completed'
                              ? 'bg-emerald-500'
                              : exec.status === 'waiting_for_approval'
                              ? 'bg-amber-500'
                              : exec.status === 'failed'
                              ? 'bg-rose-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        <span className="capitalize">{exec.status.replace(/_/g, ' ')}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {exec.trigger_type}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {exec.duration_seconds !== null ? `${exec.duration_seconds}s` : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {exec.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/executions/${exec.id}`}
                        className="text-teal-700 hover:text-teal-900 font-medium hover:underline"
                      >
                        Trace &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
