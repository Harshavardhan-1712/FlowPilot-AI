'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GitBranch,
  Plus,
  Sparkles,
  Search,
  Play,
  RotateCcw,
  CheckCircle,
  FileEdit,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { Workflow, WorkflowGenerateResponse } from '@/lib/types';
import { GenerateWorkflowModal } from '@/components/ai-wizard/GenerateWorkflowModal';

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'draft'>('all');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const fetchWorkflows = async () => {
    try {
      const data = await api.listWorkflows();
      setWorkflows(data);
    } catch (err) {
      console.error('Failed to fetch workflows', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleCreateBlank = async () => {
    try {
      const newWf = await api.createWorkflow({
        name: `New Automation Flow #${workflows.length + 1}`,
        description: 'Custom DAG pipeline created from canvas.',
      });
      router.push(`/workflows/${newWf.id}`);
    } catch (err) {
      console.error('Failed to create workflow', err);
    }
  };

  const handleApplyAiWorkflow = async (plan: WorkflowGenerateResponse) => {
    try {
      const newWf = await api.createWorkflow({
        name: plan.suggested_name,
        description: plan.suggested_description,
        definition: plan.definition,
      });
      router.push(`/workflows/${newWf.id}`);
    } catch (err) {
      console.error('Failed to save AI-generated workflow', err);
    }
  };

  const handleExecute = async (id: string) => {
    setExecutingId(id);
    try {
      const exec = await api.executeWorkflow(id, {
        ticket_text: 'Customer ticket inquiry for duplicate charge test.'
      });
      router.push(`/executions/${exec.id}`);
    } catch (err) {
      console.error('Execution failed', err);
    } finally {
      setExecutingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      await api.deleteWorkflow(id);
      fetchWorkflows();
    } catch (err) {
      console.error('Failed to delete workflow', err);
    }
  };

  const filtered = workflows.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'all') return matchesSearch;
    return matchesSearch && w.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Title & Top Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Workflow Library</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Orchestrate deterministic DAG pipelines, configure AI reasoning, and manage versions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-xs font-medium shadow-2xs flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-700" />
            <span>Generate with AI</span>
          </button>
          <button
            onClick={handleCreateBlank}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-medium shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Workflow</span>
          </button>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search workflows by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {(['all', 'active', 'draft'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                filter === tab
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Workflow Card Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 font-mono">
          Loading workflow library...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center space-y-3">
          <GitBranch className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No workflows found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search ? 'Try adjusting your search criteria.' : 'Create your first workflow or generate one from natural language.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="px-3.5 py-1.5 bg-purple-50 text-purple-900 border border-purple-200 rounded-md text-xs font-medium flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Use AI Wizard</span>
            </button>
            <button
              onClick={handleCreateBlank}
              className="px-3.5 py-1.5 bg-teal-700 text-white rounded-md text-xs font-medium"
            >
              Create Blank
            </button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((wf) => (
            <div
              key={wf.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">{wf.name}</h3>
                  <span
                    className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                      wf.status === 'active'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {wf.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {wf.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Version v{wf.current_version}</span>
                <span>{new Date(wf.updated_at).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Link
                  href={`/workflows/${wf.id}`}
                  className="flex-1 py-2 text-center text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Open Builder</span>
                </Link>
                <button
                  onClick={() => handleExecute(wf.id)}
                  disabled={executingId === wf.id}
                  title="Run Workflow"
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-slate-700" />
                </button>
                <button
                  onClick={() => handleDelete(wf.id)}
                  title="Delete Workflow"
                  className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-200 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Workflow Planner Modal */}
      <GenerateWorkflowModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyWorkflow={handleApplyAiWorkflow}
      />
    </div>
  );
}
