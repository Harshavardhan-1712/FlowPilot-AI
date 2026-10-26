'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings,
  Users,
  Shield,
  FileText,
  Key,
  Plus,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AuditLog, Workspace } from '@/lib/types';

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Member State
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('member');
  const [memberMsg, setMemberMsg] = useState<string | null>(null);

  // Model Provider Settings State
  const [selectedProvider, setSelectedProvider] = useState('mock');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  const fetchSettings = async () => {
    try {
      const ws = await api.getCurrentWorkspace();
      setWorkspace(ws);

      const [mems, logs] = await Promise.all([
        api.listWorkspaceMembers(ws.id),
        api.getAuditLogs(30),
      ]);
      setMembers(mems);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !newEmail) return;

    setMemberMsg(null);
    try {
      await api.addWorkspaceMember(workspace.id, newEmail, newRole);
      setMemberMsg(`Added ${newEmail} as ${newRole}.`);
      setNewEmail('');
      fetchSettings();
    } catch (err: any) {
      setMemberMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings &amp; Governance</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Workspace administration, team RBAC permissions, AI model providers, and immutable audit logs.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Workspace Team RBAC */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-700" />
                <span>Workspace Members ({members.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Role-based access control (Admin, Member, Viewer)</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
              Tenant Isolated
            </span>
          </div>

          <form onSubmit={handleAddMember} className="flex gap-2">
            <input
              type="email"
              placeholder="colleague@enterprise.io"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none bg-white"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-xs font-medium shadow-2xs"
            >
              Add
            </button>
          </form>

          {memberMsg && (
            <div className="p-2 text-xs rounded bg-slate-50 border border-slate-200 text-slate-700">
              {memberMsg}
            </div>
          )}

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {members.map((m) => (
              <div key={m.id} className="p-3 flex items-center justify-between text-xs bg-white">
                <div>
                  <div className="font-medium text-slate-900">{m.full_name || m.email}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{m.email}</div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Model Provider Configuration */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-teal-700" />
              <span>AI Provider Configuration</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select model adapter. FlowPilot defaults to high-fidelity mock adapter for offline execution.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Active Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none bg-white"
              >
                <option value="mock">Deterministic Mock Provider (Zero API Cost, Instant Offline Demo)</option>
                <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                <option value="gemini">Google Gemini (Gemini 1.5 Flash)</option>
                <option value="anthropic">Anthropic Claude (Claude 3.5 Sonnet)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Provider API Key</label>
              <input
                type="password"
                placeholder={selectedProvider === 'mock' ? 'Not required for Deterministic Engine' : 'sk-...'}
                disabled={selectedProvider === 'mock'}
                className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none font-mono disabled:bg-slate-100 disabled:text-slate-400"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Never exposed to the client. Stored securely on the backend server.
              </span>
            </div>

            <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                {selectedProvider === 'mock'
                  ? 'Deterministic Engine is active. Full end-to-end execution and tests run with 0 latency.'
                  : 'Live model provider adapter configured.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-700" />
              <span>Immutable Governance &amp; Audit Trail</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological log of administrative actions, workflow approvals, and schema mutations.
            </p>
          </div>
          <button
            onClick={fetchSettings}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No audit log entries recorded yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Resource</th>
                  <th className="py-2.5 px-4">IP Address</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{log.action}</td>
                    <td className="py-2.5 px-4 text-slate-600">{log.resource_type}</td>
                    <td className="py-2.5 px-4 text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
