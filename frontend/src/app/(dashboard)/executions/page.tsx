'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlayCircle, Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { WorkflowExecution } from '@/lib/types';

export default function ExecutionsListPage() {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchExecutions = async () => {
    try {
      const data = await api.listExecutions(undefined, statusFilter === 'all' ? undefined : statusFilter);
      setExecutions(data);
    } catch (err) {
      console.error('Failed to load executions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Execution Telemetry</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit history, node execution traces, duration profiles, and error diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchExecutions}
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200 shadow-sm text-xs font-medium text-slate-600 overflow-x-auto">
        {['all', 'completed', 'waiting_for_approval', 'running', 'failed', 'cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition-colors ${
              statusFilter === st
                ? 'bg-teal-50 text-teal-800 border border-teal-200 font-semibold'
                : 'hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Execution Runs Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500 font-mono">
            Loading execution records...
          </div>
        ) : executions.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            No execution runs found matching filter.
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
                  <th className="py-2.5 px-4">Tokens</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4 text-right">Trace View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {executions.map((exec) => (
                  <tr key={exec.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
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
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {exec.total_tokens}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(exec.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/executions/${exec.id}`}
                        className="text-teal-700 hover:text-teal-900 font-medium inline-flex items-center gap-1"
                      >
                        <span>Inspect Trace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
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
