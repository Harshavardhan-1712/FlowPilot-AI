'use client';

import React from 'react';
import { X, Trash2, Sliders, Shield } from 'lucide-react';

interface NodeInspectorProps {
  selectedNode: any;
  onUpdateNode: (nodeId: string, updatedData: Record<string, any>) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeInspector({
  selectedNode,
  onUpdateNode,
  onDeleteNode,
  onClose,
}: NodeInspectorProps) {
  if (!selectedNode) return null;

  const data = selectedNode.data || {};

  const handleChange = (field: string, value: any) => {
    onUpdateNode(selectedNode.id, {
      ...data,
      [field]: value,
    });
  };

  return (
    <div className="w-80 border-l border-slate-200 bg-white p-5 overflow-y-auto h-full flex flex-col justify-between shadow-sm">
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Node Inspector
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Basic Node Metadata */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Node ID & Type
            </label>
            <div className="flex items-center justify-between text-xs font-mono bg-slate-50 p-2 rounded border border-slate-200 text-slate-700">
              <span>{selectedNode.id}</span>
              <span className="text-[10px] bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200">
                {selectedNode.type}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Node Title</label>
            <input
              type="text"
              value={data.label || ''}
              onChange={(e) => handleChange('label', e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={data.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="What does this step accomplish?"
              className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Dynamic Type-Specific Inputs */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Step Configuration
          </p>

          {selectedNode.type === 'textInput' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Variable Field Name</label>
                <input
                  type="text"
                  value={data.field_name || ''}
                  onChange={(e) => handleChange('field_name', e.target.value)}
                  placeholder="e.g. ticket_text"
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Default / Fallback Value</label>
                <textarea
                  rows={3}
                  value={data.default_value || ''}
                  onChange={(e) => handleChange('default_value', e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>
            </>
          )}

          {selectedNode.type === 'documentRetrieval' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Top-K Chunks</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={data.top_k || 3}
                  onChange={(e) => handleChange('top_k', parseInt(e.target.value))}
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Min Similarity Score (0.0 - 1.0)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={data.min_score || 0.15}
                  onChange={(e) => handleChange('min_score', parseFloat(e.target.value))}
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>
            </>
          )}

          {selectedNode.type === 'llmProcessing' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Model Selection</label>
                <select
                  value={data.model || 'mock-deterministic-v1'}
                  onChange={(e) => handleChange('model', e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none bg-white"
                >
                  <option value="mock-deterministic-v1">Mock Deterministic Engine (Offline Demo)</option>
                  <option value="gpt-4o-mini">OpenAI gpt-4o-mini</option>
                  <option value="gpt-4o">OpenAI gpt-4o</option>
                  <option value="gemini-1.5-flash">Google Gemini 1.5 Flash</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">System Instructions</label>
                <textarea
                  rows={4}
                  value={data.system_prompt || ''}
                  onChange={(e) => handleChange('system_prompt', e.target.value)}
                  placeholder="Analyze inputs and classify sentiment..."
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none font-mono text-[11px]"
                />
              </div>
            </>
          )}

          {selectedNode.type === 'conditionalBranch' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Evaluate Variable</label>
                <input
                  type="text"
                  value={data.condition_variable || ''}
                  onChange={(e) => handleChange('condition_variable', e.target.value)}
                  placeholder="e.g. urgency"
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Operator</label>
                <select
                  value={data.operator || 'equals'}
                  onChange={(e) => handleChange('operator', e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none bg-white"
                >
                  <option value="equals">Equals (==)</option>
                  <option value="not_equals">Not Equals (!=)</option>
                  <option value="contains">Contains</option>
                  <option value="greater_than">Greater Than (&gt;)</option>
                  <option value="less_than">Less Than (&lt;)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Target Value</label>
                <input
                  type="text"
                  value={data.value || ''}
                  onChange={(e) => handleChange('value', e.target.value)}
                  placeholder="e.g. high"
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>
            </>
          )}

          {selectedNode.type === 'httpRequest' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">HTTP Method</label>
                <select
                  value={data.method || 'GET'}
                  onChange={(e) => handleChange('method', e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none bg-white"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Target URL</label>
                <input
                  type="url"
                  value={data.url || ''}
                  onChange={(e) => handleChange('url', e.target.value)}
                  placeholder="https://api.example.com/webhook"
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>SSRF Protection active: Local & private IPs are blocked.</span>
              </div>
            </>
          )}

          {selectedNode.type === 'humanApproval' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Action Name</label>
                <input
                  type="text"
                  value={data.action_name || ''}
                  onChange={(e) => handleChange('action_name', e.target.value)}
                  placeholder="e.g. Approve Customer Refund"
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Reason / Summary Template</label>
                <textarea
                  rows={2}
                  value={data.summary_template || ''}
                  onChange={(e) => handleChange('summary_template', e.target.value)}
                  placeholder="Review proposed resolution..."
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>
            </>
          )}

          {selectedNode.type === 'emailDraft' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Recipient</label>
                <input
                  type="email"
                  value={data.recipient || ''}
                  onChange={(e) => handleChange('recipient', e.target.value)}
                  placeholder="user@example.com"
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={data.subject || ''}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  placeholder="FlowPilot Resolution Update"
                  className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Action */}
      <div className="pt-4 border-t border-slate-200">
        <button
          onClick={() => onDeleteNode(selectedNode.id)}
          className="w-full py-2 px-3 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md flex items-center justify-center gap-2 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Remove Node from Canvas</span>
        </button>
      </div>
    </div>
  );
}
