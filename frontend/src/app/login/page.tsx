'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Workflow, Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { api, setStoredToken, setStoredWorkspaceId } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@flowpilot.ai');
  const [password, setPassword] = useState('flowpilot_secure_demo_2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login(email, password);
      setStoredToken(res.access_token);
      if (res.active_workspace_id) {
        setStoredWorkspaceId(res.active_workspace_id);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCreds = () => {
    setEmail('admin@flowpilot.ai');
    setPassword('flowpilot_secure_demo_2026');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-11 h-11 rounded-xl bg-teal-700 flex items-center justify-center text-white shadow-sm shadow-teal-700/20">
            <Workflow className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Sign in to FlowPilot AI
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Enterprise Agentic Workflow Automation Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10 space-y-6">
          {/* Quick Demo Login Preset Banner */}
          <div className="bg-teal-50 border border-teal-200/80 rounded-lg p-3 text-xs flex items-start justify-between gap-2">
            <div>
              <span className="font-semibold text-teal-900 block mb-0.5">Ready-to-Run Demo Account</span>
              <span className="text-teal-800 text-[11px] block">
                Pre-seeded with Customer Feedback Intelligence workflow &amp; SOP docs.
              </span>
            </div>
            <button
              type="button"
              onClick={fillDemoCreds}
              className="px-2.5 py-1 text-[11px] font-medium bg-teal-700 text-white rounded hover:bg-teal-800 shrink-0"
            >
              Fill Demo
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-700">Email Address</label>
              <div className="mt-1 relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600 focus:outline-none"
                  placeholder="admin@flowpilot.ai"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Password</label>
              <div className="mt-1 relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600 focus:outline-none font-mono"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Need a new workspace?{' '}
            <Link href="/register" className="font-medium text-teal-700 hover:text-teal-800">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
