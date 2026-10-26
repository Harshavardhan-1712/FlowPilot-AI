'use client';

import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Upload,
  Search,
  FileText,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  RotateCcw,
  Tag,
} from 'lucide-react';
import { api } from '@/lib/api';
import { KnowledgeDocument, DocumentSearchResult } from '@/lib/types';

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Search Sandbox State
  const [searchQuery, setSearchQuery] = useState('duplicate billing refund policy');
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchDocuments = async () => {
    try {
      const data = await api.listDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      await api.uploadDocument(file, title || undefined);
      setFile(null);
      setTitle('');
      fetchDocuments();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this document and its chunk vectors?')) return;
    try {
      await api.deleteDocument(id);
      fetchDocuments();
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await api.searchKnowledgeBase(searchQuery, 4);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Agentic RAG Knowledge Base</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tenant-isolated repository for company SOPs, manuals, and policy documentation.
          </p>
        </div>

        <button
          onClick={fetchDocuments}
          className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Document Ingestion Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-teal-700" />
              <span>Ingest Document</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Supports PDF, Markdown, and TXT files. Auto-chunked with vector embeddings.
            </p>
          </div>

          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Document Title</label>
              <input
                type="text"
                placeholder="e.g. Customer Support &amp; Refund SOP"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">File Upload</label>
              <input
                type="file"
                accept=".pdf,.txt,.md,.markdown"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
              />
            </div>

            {uploadError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full py-2 px-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-medium shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Ingesting &amp; Vectorizing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Ingest to Vector Store</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Document Library Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Workspace Document Repository ({documents.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Available exclusively to workflows executing in this workspace.
            </p>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono">
                Loading knowledge documents...
              </div>
            ) : documents.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No documents uploaded yet. Ingest your first policy document.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-mono text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Title &amp; File</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Chunks</th>
                    <th className="py-2.5 px-4">Created</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{doc.title}</div>
                        <div className="text-[11px] font-mono text-slate-400">{doc.filename}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span className="capitalize">{doc.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {doc.chunk_count} chunks
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDelete(doc.id)}
                          title="Delete Document"
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Semantic Retrieval Sandbox */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Search className="w-4 h-4 text-teal-700" />
            <span>Interactive Vector &amp; Keyword Retrieval Sandbox</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Test how FlowPilot agent nodes query the vector index and retrieve cited evidence chunks.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type a natural language query, e.g. duplicate refund policy limit..."
            className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Run Retrieval</span>
          </button>
        </form>

        {/* Results */}
        {searchResults.length > 0 && (
          <div className="pt-2 space-y-3">
            <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold block">
              Retrieved Chunks &amp; Evidence ({searchResults.length} Matches)
            </span>
            <div className="grid md:grid-cols-2 gap-4">
              {searchResults.map((res) => (
                <div
                  key={res.chunk_id}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 truncate">{res.document_title}</span>
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                      Score: {(res.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-slate-600 font-serif leading-relaxed line-clamp-4 bg-white p-2.5 rounded border border-slate-200/80">
                    &quot;{res.content}&quot;
                  </p>
                  <div className="text-[10px] font-mono text-slate-400">
                    Citation ID: chunk-{res.chunk_index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
