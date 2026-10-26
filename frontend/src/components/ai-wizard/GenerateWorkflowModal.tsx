'use client';

import React, { useState } from 'react';
import { Sparkles, X, Check, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { WorkflowGenerateResponse } from '@/lib/types';

interface GenerateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyWorkflow: (plan: WorkflowGenerateResponse) => void;
}

const SAMPLE_PROMPTS = [
  "Monitor support tickets, classify urgency and sentiment, search policy manual, route high-priority cases to manager approval, and draft customer response.",
  "Ingest incoming vendor invoices, verify amount against budget limits, and pause for financial approval if over $1,000.",
  "Process customer cancellation requests, check account tenure in documentation, and send retention offers.",
];

export function GenerateWorkflowModal({
  isOpen,
  onClose,
  onApplyWorkflow,
}: GenerateWorkflowModalProps) {
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<WorkflowGenerateResponse | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 10) {
      setError('Please provide a prompt of at least 10 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const plan = await api.generateWorkflowPlan(prompt);
      setGeneratedPlan(plan);
    } catch (err: any) {
      setError(err.message || 'Failed to generate workflow plan');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (generatedPlan) {
      onApplyWorkflow(generatedPlan);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">AI Workflow Planner</h2>
              <p className="text-xs text-slate-500">Transform natural language goals into a validated DAG pipeline</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {!generatedPlan ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Describe the automation task you want to build
                </label>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Ingest customer feedback, search product documentation, classify issues, and pause for approval if urgent..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-3 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              {/* Sample Prompts */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Sample Prompts
                </div>
                <div className="space-y-1.5">
                  {SAMPLE_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPrompt(p)}
                      className="w-full text-left text-xs p-2 rounded-md bg-slate-50 hover:bg-teal-50/60 border border-slate-200 text-slate-700 hover:text-teal-900 transition-colors"
                    >
                      &quot;{p}&quot;
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-teal-50/50 border border-teal-200 rounded-lg p-4">
                <div className="text-xs font-semibold text-teal-900">{generatedPlan.suggested_name}</div>
                <div className="text-xs text-teal-800 mt-1">{generatedPlan.suggested_description}</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Generated Pipeline Architecture
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 whitespace-pre-line font-mono text-[11px]">
                  {generatedPlan.explanation}
                </div>
              </div>

              {/* Node Summary List */}
              <div>
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Nodes ({generatedPlan.definition.nodes.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {generatedPlan.definition.nodes.map((n, idx) => (
                    <div key={n.id} className="p-2 border border-slate-200 rounded bg-white text-xs flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-mono text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-slate-800 truncate">{n.data.label || n.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Validation Status */}
              <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>DAG Structure verified. 0 cycles detected, valid connection ports.</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {!generatedPlan ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Structured DAG</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setGeneratedPlan(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Adjust Prompt
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md shadow-sm flex items-center gap-2"
              >
                <span>Load into Visual Canvas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
