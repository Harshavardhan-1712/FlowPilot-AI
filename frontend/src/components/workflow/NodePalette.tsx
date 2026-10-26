'use client';

import React from 'react';
import {
  Play,
  Clock,
  Webhook,
  FileText,
  Search,
  Sparkles,
  GitFork,
  Globe,
  Mail,
  UserCheck,
  Cpu,
  CheckCircle,
  Plus
} from 'lucide-react';

interface NodePaletteProps {
  onAddNode: (type: string, label: string) => void;
}

const PALETTE_CATEGORIES = [
  {
    category: 'Triggers',
    items: [
      { type: 'manualTrigger', label: 'Manual Trigger', icon: Play, color: 'text-teal-700 bg-teal-50' },
      { type: 'scheduledTrigger', label: 'Scheduled Trigger', icon: Clock, color: 'text-sky-700 bg-sky-50' },
      { type: 'webhookTrigger', label: 'Webhook Trigger', icon: Webhook, color: 'text-indigo-700 bg-indigo-50' },
    ],
  },
  {
    category: 'Inputs & Knowledge',
    items: [
      { type: 'textInput', label: 'Text Input', icon: FileText, color: 'text-slate-700 bg-slate-50' },
      { type: 'documentRetrieval', label: 'Document Retrieval', icon: Search, color: 'text-emerald-700 bg-emerald-50' },
    ],
  },
  {
    category: 'AI & Flow Control',
    items: [
      { type: 'llmProcessing', label: 'LLM Processing', icon: Sparkles, color: 'text-purple-700 bg-purple-50' },
      { type: 'conditionalBranch', label: 'Conditional Branch', icon: GitFork, color: 'text-amber-700 bg-amber-50' },
    ],
  },
  {
    category: 'Actions & Integration',
    items: [
      { type: 'httpRequest', label: 'HTTP Request', icon: Globe, color: 'text-cyan-700 bg-cyan-50' },
      { type: 'emailDraft', label: 'Email Draft', icon: Mail, color: 'text-rose-700 bg-rose-50' },
      { type: 'dataTransformation', label: 'Data Transform', icon: Cpu, color: 'text-teal-700 bg-teal-50' },
    ],
  },
  {
    category: 'Governance & Output',
    items: [
      { type: 'humanApproval', label: 'Human Approval', icon: UserCheck, color: 'text-orange-700 bg-orange-50' },
      { type: 'endOutput', label: 'End / Output', icon: CheckCircle, color: 'text-emerald-700 bg-emerald-50' },
    ],
  },
];

export function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <div className="w-64 border-r border-slate-200 bg-white p-4 overflow-y-auto h-full flex flex-col gap-5">
      <div>
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1">
          Node Palette
        </h3>
        <p className="text-[11px] text-slate-500">Click or drag nodes into the canvas.</p>
      </div>

      <div className="space-y-4">
        {PALETTE_CATEGORIES.map((cat) => (
          <div key={cat.category}>
            <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold mb-1.5 px-1">
              {cat.category}
            </div>
            <div className="space-y-1">
              {cat.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() => onAddNode(item.type, item.label)}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/reactflow', item.type);
                      e.dataTransfer.setData('application/label', item.label);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-md border border-slate-200/80 hover:border-teal-500 hover:bg-slate-50 transition-all flex items-center justify-between group cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1 rounded ${item.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">
                        {item.label}
                      </span>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
