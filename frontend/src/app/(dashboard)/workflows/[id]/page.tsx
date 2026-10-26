'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Save,
  Play,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ChevronLeft,
  Loader2,
  Check,
} from 'lucide-react';
import Link from 'next/link';

import { api } from '@/lib/api';
import { Workflow, WorkflowDefinition, WorkflowValidationResult } from '@/lib/types';
import { nodeTypes } from '@/components/workflow/CustomNodes';
import { NodePalette } from '@/components/workflow/NodePalette';
import { NodeInspector } from '@/components/workflow/NodeInspector';
import { GenerateWorkflowModal } from '@/components/ai-wizard/GenerateWorkflowModal';

export default function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [validation, setValidation] = useState<WorkflowValidationResult | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Test Runner Drawer State
  const [isRunnerOpen, setIsRunnerOpen] = useState(false);
  const [testPayload, setTestPayload] = useState('{\n  "ticket_text": "Duplicate charge on invoice #INV-2026-883 for $1,200. Please reverse immediately."\n}');
  const [isRunning, setIsRunning] = useState(false);
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [latestExecId, setLatestExecId] = useState<string | null>(null);

  // Load workflow definition
  useEffect(() => {
    if (!id) return;
    const loadWf = async () => {
      try {
        const wf = await api.getWorkflow(id);
        setWorkflow(wf);

        if (wf.definition) {
          const flowNodes: Node[] = (wf.definition.nodes || []).map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data || {},
          }));
          const flowEdges: Edge[] = (wf.definition.edges || []).map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || undefined,
            targetHandle: e.targetHandle || undefined,
            label: e.label || undefined,
            animated: true,
            style: { stroke: '#0d9488', strokeWidth: 2 },
          }));
          setNodes(flowNodes);
          setEdges(flowEdges);

          // Run initial graph validation
          const val = await api.validateWorkflow(wf.definition);
          setValidation(val);
        }
      } catch (err) {
        console.error('Failed to load workflow', err);
      }
    };
    loadWf();
  }, [id]);

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#0d9488', strokeWidth: 2 },
          },
          eds
        )
      ),
    []
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  const handleAddNode = (type: string, label: string) => {
    const newNodeId = `node-${Date.now().toString().slice(-4)}`;
    const newNode: Node = {
      id: newNodeId,
      type,
      position: { x: 250 + nodes.length * 40, y: 150 + (nodes.length % 5) * 50 },
      data: { label, description: `Configured ${label} node` },
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode);
  };

  const handleUpdateNodeData = (nodeId: string, updatedData: Record<string, any>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: updatedData } : n))
    );
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode((prev) => (prev ? { ...prev, data: updatedData } : null));
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  const handleSaveWorkflow = async () => {
    if (!workflow) return;
    setIsSaving(true);

    const definition: WorkflowDefinition = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type || 'textInput',
        position: n.position,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: (e.label as string) || null,
      })),
    };

    try {
      // Validate
      const val = await api.validateWorkflow(definition);
      setValidation(val);

      // Save to backend
      const updated = await api.updateWorkflow(workflow.id, {
        definition,
        status: val.is_valid ? 'active' : 'draft',
      });
      setWorkflow(updated);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestRun = async () => {
    if (!workflow) return;
    setIsRunning(true);
    setRunLogs(['Initiating execution request...']);

    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(testPayload);
    } catch {
      parsedPayload = { raw_text: testPayload };
    }

    try {
      const exec = await api.executeWorkflow(workflow.id, parsedPayload);
      setLatestExecId(exec.id);

      setRunLogs((prev) => [
        ...prev,
        `Execution started: ID ${exec.id}`,
        `Current Status: ${exec.status.toUpperCase()}`,
        ...(exec.node_executions || []).map(
          (ne) => `  - Step '${ne.node_name}' (${ne.node_type}): ${ne.status} [${ne.duration_ms}ms]`
        ),
      ]);

      if (exec.status === 'waiting_for_approval') {
        setRunLogs((prev) => [
          ...prev,
          '⚠️ Paused at Human Approval Gate: Action requires supervisor sign-off.',
        ]);
      } else if (exec.status === 'completed') {
        setRunLogs((prev) => [
          ...prev,
          `✅ Workflow completed successfully in ${exec.duration_seconds}s!`,
        ]);
      }

      // Update node visual status indicators
      setNodes((currentNodes) =>
        currentNodes.map((n) => {
          const matchNe = (exec.node_executions || []).find((ne) => ne.node_id === n.id);
          return {
            ...n,
            data: {
              ...n.data,
              status: matchNe ? matchNe.status : 'idle',
            },
          };
        })
      );
    } catch (err: any) {
      setRunLogs((prev) => [...prev, `❌ Run error: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleApplyAiWorkflow = (plan: any) => {
    const flowNodes: Node[] = (plan.definition.nodes || []).map((n: any) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data || {},
    }));
    const flowEdges: Edge[] = (plan.definition.edges || []).map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label || undefined,
      animated: true,
      style: { stroke: '#0d9488', strokeWidth: 2 },
    }));
    setNodes(flowNodes);
    setEdges(flowEdges);
    setValidation({ is_valid: plan.is_valid, issues: plan.validation_issues });
  };

  return (
    <div className="-m-8 h-[calc(100vh-4rem)] flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Builder Toolbar */}
      <div className="h-14 border-b border-slate-200 bg-white px-5 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/workflows"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                {workflow?.name || 'Loading Workflow...'}
              </span>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                v{workflow?.current_version || 1}
              </span>
              {validation && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    validation.is_valid
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  {validation.is_valid ? 'DAG Validated' : 'DAG Invalid'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-700" />
            <span>AI Assistant</span>
          </button>

          <button
            onClick={handleSaveWorkflow}
            disabled={isSaving}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save &amp; Validate</span>
          </button>

          <button
            onClick={() => setIsRunnerOpen(true)}
            className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Test Run</span>
          </button>
        </div>
      </div>

      {/* Main Canvas + Panels */}
      <div className="flex-1 flex overflow-hidden relative">
        <NodePalette onAddNode={handleAddNode} />

        <div className="flex-1 h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
            className="bg-slate-50"
          >
            <Background color="#cbd5e1" gap={18} size={1} variant={BackgroundVariant.Dots} />
            <Controls className="bg-white border border-slate-200 rounded-lg shadow-sm" />
            <MiniMap
              nodeStrokeColor="#0d9488"
              nodeColor="#f8fafc"
              className="bg-white border border-slate-200 rounded-lg shadow-sm"
            />
          </ReactFlow>

          {/* Validation Warnings Overlay */}
          {validation && !validation.is_valid && (
            <div className="absolute top-4 left-4 z-20 max-w-md bg-rose-50/95 border border-rose-200 text-rose-900 rounded-lg p-3 shadow-md text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>DAG Graph Issues Detected:</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-rose-700">
                {validation.issues.map((issue, idx) => (
                  <li key={idx}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Selected Node Inspector */}
        {selectedNode && (
          <NodeInspector
            selectedNode={selectedNode}
            onUpdateNode={handleUpdateNodeData}
            onDeleteNode={handleDeleteNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      {/* Test Run Drawer */}
      {isRunnerOpen && (
        <div className="absolute inset-y-0 right-0 w-96 bg-white border-l border-slate-200 shadow-xl z-30 flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-teal-700 fill-current" />
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Workflow Test Runner
              </h3>
            </div>
            <button
              onClick={() => setIsRunnerOpen(false)}
              className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
            >
              &times;
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Trigger Payload (JSON)
              </label>
              <textarea
                rows={5}
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700">Execution Progression Log</label>
                {latestExecId && (
                  <Link
                    href={`/executions/${latestExecId}`}
                    className="text-[11px] font-medium text-teal-700 hover:underline"
                  >
                    Open Live Trace &rarr;
                  </Link>
                )}
              </div>
              <div className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-[11px] h-64 overflow-y-auto space-y-1">
                {runLogs.length === 0 ? (
                  <span className="text-slate-500">Ready. Click &quot;Execute Pipeline&quot; to begin.</span>
                ) : (
                  runLogs.map((line, idx) => <div key={idx}>{line}</div>)
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              onClick={() => setIsRunnerOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Close
            </button>
            <button
              onClick={handleTestRun}
              disabled={isRunning}
              className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>Execute Pipeline</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Modal */}
      <GenerateWorkflowModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyWorkflow={handleApplyAiWorkflow}
      />
    </div>
  );
}
