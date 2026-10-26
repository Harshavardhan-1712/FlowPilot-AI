'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlayCircle,
  Ban,
  ShieldAlert,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';
import { WorkflowExecution } from '@/lib/types';

export default function ExecutionTracePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const fetchExecution = async () => {
    if (!id) return;
    try {
      const data = await api.getExecution(id);
      setExecution(data);
      // Auto-expand nodes with outputs or errors
      const initialExpanded: Record<string, boolean> = {};
      (data.node_executions || []).forEach((ne) => {
        initialExpanded[ne.id] = ne.status === 'failed' || ne.status === 'waiting_for_approval';
      });
      setExpandedNodes(initialExpanded);
    } catch (err) {
      console.error('Failed to load execution details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecution();
    // Poll updates if running or pending
    const interval = setInterval(() => {
      if (execution?.status === 'running' || execution?.status === 'pending') {
        fetchExecution();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [id, execution?.status]);

  const handleCancel = async () => {
    if (!id) return;
    try {
      const updated = await api.cancelExecution(id);
      setExecution(updated);
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    }
  };

  const toggleNodeExpand = (nodeExecId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeExecId]: !prev[nodeExecId],
    }));
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500 font-mono">
        Loading execution trace #{id?.slice(0, 8)}...
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        Execution record not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/executions"
            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Execution Trace</h1>
              <span className="font-mono text-xs text-slate-400">#{execution.id}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Triggered via <span className="font-mono font-medium">{execution.trigger_type}</span> on{' '}
              {new Date(execution.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchExecution}
            title="Refresh Trace"
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          {execution.status === 'running' && (
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium flex items-center gap-1.5"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancel Run</span>
            </button>
          )}
        </div>
      </div>

      {/* Execution Telemetry Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div>
          <span className="text-slate-400 block mb-1">State</span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${
              execution.status === 'completed'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : execution.status === 'waiting_for_approval'
                ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-300/40'
                : execution.status === 'failed'
                ? 'bg-rose-50 text-rose-800 border-rose-300'
                : 'bg-blue-50 text-blue-800 border-blue-300 animate-pulse'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                execution.status === 'completed'
                  ? 'bg-emerald-500'
                  : execution.status === 'waiting_for_approval'
                  ? 'bg-amber-500'
                  : execution.status === 'failed'
                  ? 'bg-rose-500'
                  : 'bg-blue-500'
              }`}
            />
            {execution.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block mb-1">Total Duration</span>
          <span className="font-mono text-sm font-semibold text-slate-800">
            {execution.duration_seconds !== null ? `${execution.duration_seconds}s` : 'In Progress...'}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block mb-1">Token Consumption</span>
          <span className="font-mono text-sm font-semibold text-slate-800">
            {execution.total_tokens} tokens
          </span>
        </div>

        <div>
          <span className="text-slate-400 block mb-1">Trace Identifier</span>
          <span className="font-mono text-xs text-slate-600 truncate block">
            {execution.trace_id}
          </span>
        </div>
      </div>

      {/* Paused for Approval Alert */}
      {execution.status === 'waiting_for_approval' && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-4 flex items-center justify-between text-xs text-amber-950 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-200/60 flex items-center justify-center text-amber-800 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold">Human Approval Required</div>
              <div className="text-amber-800 text-[11px] mt-0.5">
                This workflow reached an approval gate. Downstream steps are paused until approved.
              </div>
            </div>
          </div>
          <Link
            href="/approvals"
            className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <span>Review &amp; Approve</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Step by Step Timeline */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
          Node Execution Timeline ({execution.node_executions?.length || 0} Steps)
        </h2>

        <div className="space-y-3">
          {(execution.node_executions || []).map((ne, idx) => {
            const isExpanded = expandedNodes[ne.id];
            return (
              <div
                key={ne.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all"
              >
                <div
                  onClick={() => toggleNodeExpand(ne.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-mono text-[11px] font-semibold">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">
                          {ne.node_name || ne.node_id}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {ne.node_type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        ID: {ne.node_id}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[11px] text-slate-500">
                      {ne.duration_ms}ms
                    </span>
                    <span
                      className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                        ne.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : ne.status === 'waiting_for_approval'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : ne.status === 'failed'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {ne.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Expanded Inputs / Outputs Inspector */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-3">
                    {ne.error_message && (
                      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                        <span className="font-semibold block mb-0.5">Error Diagnostic:</span>
                        <span className="font-mono text-[11px]">{ne.error_message}</span>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block mb-1">
                          Node Inputs (Redacted)
                        </span>
                        <pre className="bg-white border border-slate-200 p-2.5 rounded-lg font-mono text-[11px] text-slate-700 overflow-x-auto max-h-48">
                          {JSON.stringify(ne.inputs || {}, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block mb-1">
                          Node Outputs
                        </span>
                        <pre className="bg-white border border-slate-200 p-2.5 rounded-lg font-mono text-[11px] text-slate-700 overflow-x-auto max-h-48">
                          {JSON.stringify(ne.outputs || {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
