'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  RotateCcw,
  ShieldAlert,
  Loader2,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ApprovalRequest } from '@/lib/types';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchApprovals = async () => {
    try {
      const data = await api.listApprovals(filter);
      setApprovals(data);
    } catch (err) {
      console.error('Failed to load approvals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [filter]);

  const handleDecision = async (id: string, decision: 'approved' | 'rejected') => {
    setSubmittingId(id);
    setSuccessMessage(null);
    try {
      const notes = reviewerNotes[id] || (decision === 'approved' ? 'Approved by supervisor' : 'Rejected by reviewer');
      await api.submitApprovalDecision(id, decision, notes);
      setSuccessMessage(`Successfully ${decision} action. Execution has resumed.`);
      fetchApprovals();
    } catch (err: any) {
      alert(`Decision error: ${err.message}`);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Human Approval Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Governance gates for sensitive actions, financial transactions, and external notifications.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchApprovals}
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200 shadow-sm text-xs font-medium text-slate-600">
        {(['pending', 'approved', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
              filter === tab
                ? 'bg-teal-50 text-teal-800 border border-teal-200 font-semibold'
                : 'hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Approvals List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 font-mono">
          Loading approval requests...
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-16 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">
            No {filter} approval requests
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When automated workflows encounter sensitive operations, they will pause and appear here for sign-off.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((app) => (
            <div
              key={app.id}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{app.action_name}</span>
                    <span
                      className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                        app.status === 'pending'
                          ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
                          : app.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{app.action_summary}</p>
                </div>

                <div className="text-right text-[11px] font-mono text-slate-400 shrink-0">
                  <div>Requested: {new Date(app.created_at).toLocaleTimeString()}</div>
                  <Link
                    href={`/executions/${app.execution_id}`}
                    className="text-teal-700 hover:underline inline-flex items-center gap-1 mt-1 font-sans"
                  >
                    <span>View Paused Execution</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Proposed Payload Box */}
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block mb-1">
                  Proposed Side-Effect Payload
                </span>
                <pre className="bg-slate-50 border border-slate-200 p-3 rounded-lg font-mono text-[11px] text-slate-700 overflow-x-auto max-h-40">
                  {JSON.stringify(app.proposed_payload || {}, null, 2)}
                </pre>
              </div>

              {/* Decision Actions if Pending */}
              {app.status === 'pending' ? (
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <input
                    type="text"
                    placeholder="Optional reviewer notes / rationale..."
                    value={reviewerNotes[app.id] || ''}
                    onChange={(e) =>
                      setReviewerNotes((prev) => ({ ...prev, [app.id]: e.target.value }))
                    }
                    className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDecision(app.id, 'rejected')}
                      disabled={submittingId === app.id}
                      className="px-3.5 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleDecision(app.id, 'approved')}
                      disabled={submittingId === app.id}
                      className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {submittingId === app.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Approve &amp; Resume Run</span>
                    </button>
                  </div>
                </div>
              ) : (
                app.reviewer_notes && (
                  <div className="pt-2 text-xs text-slate-500 font-mono">
                    <span className="font-semibold text-slate-700">Reviewer Note:</span>{' '}
                    {app.reviewer_notes}
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
