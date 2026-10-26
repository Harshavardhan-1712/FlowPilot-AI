'use client';

import React from 'react';
import Link from 'next/link';
import {
  Workflow,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  GitBranch,
  BookOpen,
  ArrowRight,
  UserCheck,
  Server,
  Zap,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-30 px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-sm">
            <Workflow className="w-5 h-5" />
          </div>
          <span className="font-semibold text-slate-900 tracking-tight text-base">FlowPilot AI</span>
        </div>

        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 px-3.5 py-1.5 rounded-md shadow-sm transition-colors"
          >
            Open Console
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-8 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-800 border border-teal-200">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>Autonomous DAG Orchestration &amp; Knowledge Work Automation</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 max-w-3xl mx-auto leading-tight">
          Turn natural language business requirements into{' '}
          <span className="text-teal-700 underline decoration-teal-300 underline-offset-4">
            secure, observable DAG workflows
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          FlowPilot AI bridges natural language reasoning with rigid DAG execution. Generate pipelines,
          retrieve internal policies via Agentic RAG, invoke sandboxed tools with SSRF protection,
          and enforce human-in-the-loop approval before sensitive operations.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 shadow-sm flex items-center gap-2 transition-all hover:gap-3"
          >
            <span>Launch Platform Console</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-colors"
          >
            Register Workspace
          </Link>
        </div>
      </section>

      {/* Architectural Guarantee Grid */}
      <section className="py-16 px-8 max-w-6xl mx-auto border-t border-slate-200">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-2">
            Engine Capabilities
          </h2>
          <p className="text-2xl font-bold text-slate-900">
            Engineered for enterprise safety and deterministic control
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
              <GitBranch className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Visual React Flow Canvas</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Design, inspect, and dry-run 12 node types. Cycle detection, topological validation,
              and branching logic prevent runtime DAG errors.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Tenant-Isolated Agentic RAG</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ingest PDF, Markdown, and TXT SOPs. Hybrid vector cosine similarity and keyword search
              guarantee zero cross-workspace document leaks.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center border border-orange-200">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Human Approval Gates</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sensitive operations (refunds, notifications, external updates) pause the execution
              state machine until an authorized human signs off.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">AI Plan Synthesis</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Describe complex tasks in natural language. FlowPilot synthesizes full DAG pipelines
              with automated parameter schemas and validation checks.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">SSRF &amp; Secret Redaction</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Outbound HTTP requests block private subnets, loopbacks, and cloud metadata IPs.
              API keys and tokens are automatically scrubbed from logs.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Live SSE Observability</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Real-time execution step timelines, millisecond durations, token usage tracking, and
              actionable error diagnostics on failures.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 py-6 px-8 bg-white text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-mono">FlowPilot AI Platform — Enterprise Orchestrator</div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-slate-900">Login</Link>
            <Link href="/register" className="hover:text-slate-900">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
