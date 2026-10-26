'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
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
} from 'lucide-react';

interface CustomNodeData {
  label: string;
  description?: string;
  status?: 'idle' | 'running' | 'completed' | 'waiting_for_approval' | 'failed' | 'skipped';
  [key: string]: any;
}

const statusColors = {
  idle: 'border-slate-300 bg-white text-slate-800',
  running: 'border-blue-500 bg-blue-50/40 text-blue-900 ring-2 ring-blue-400/40 animate-pulse',
  completed: 'border-emerald-500 bg-emerald-50/40 text-emerald-950 ring-1 ring-emerald-400/40',
  waiting_for_approval: 'border-amber-500 bg-amber-50/60 text-amber-950 ring-2 ring-amber-400/60',
  failed: 'border-rose-500 bg-rose-50/40 text-rose-950 ring-1 ring-rose-400/40',
  skipped: 'border-slate-300 bg-slate-100/60 text-slate-400 opacity-60',
};

function BaseNodeComponent({
  title,
  subtitle,
  category,
  icon: Icon,
  color,
  hasInput = true,
  hasOutput = true,
  isBranch = false,
  status = 'idle',
  selected,
}: {
  title: string;
  subtitle?: string;
  category: string;
  icon: any;
  color: string;
  hasInput?: boolean;
  hasOutput?: boolean;
  isBranch?: boolean;
  status?: string;
  selected?: boolean;
}) {
  const statusClass = statusColors[status as keyof typeof statusColors] || statusColors.idle;

  return (
    <div
      className={`min-w-[210px] max-w-[260px] rounded-lg border-2 shadow-sm transition-all duration-150 p-3 ${statusClass} ${
        selected ? 'ring-2 ring-teal-600 shadow-md scale-[1.02]' : 'hover:border-slate-400'
      }`}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-teal-600 border-2 border-white"
        />
      )}

      <div className="flex items-start gap-2.5">
        <div className={`p-1.5 rounded-md ${color} text-white shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="overflow-hidden">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 leading-none mb-1">
            {category}
          </div>
          <div className="text-xs font-semibold text-slate-900 truncate leading-tight">
            {title}
          </div>
          {subtitle && (
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {isBranch ? (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            style={{ top: '30%' }}
            className="w-3 h-3 bg-amber-500 border-2 border-white"
          />
          <Handle
            id="false"
            type="source"
            position={Position.Right}
            style={{ top: '70%' }}
            className="w-3 h-3 bg-slate-500 border-2 border-white"
          />
        </>
      ) : hasOutput ? (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-teal-600 border-2 border-white"
        />
      ) : null}
    </div>
  );
}

// 1. Manual Trigger
export const ManualTriggerNode = memo(({ data, selected }: any) => (
  <BaseNodeComponent
    title={data?.label || 'Manual Trigger'}
    subtitle="User or API activation"
    category="Trigger"
    icon={Play}
    color="bg-teal-700"
    hasInput={false}
    hasOutput={true}
    status={data?.status}
    selected={selected}
  />
));
ManualTriggerNode.displayName = 'ManualTriggerNode';

// 2. Scheduled Trigger
export const ScheduledTriggerNode = memo(({ data, selected }: any) => (
  <BaseNodeComponent
    title={data?.label || 'Scheduled Trigger'}
    subtitle={data?.cron || '0 * * * * (Hourly)'}
    category="Trigger"
    icon={Clock}
    color="bg-sky-700"
    hasInput={false}
    hasOutput={true}
    status={data?.status}
    selected={selected}
  />
));
ScheduledTriggerNode.displayName = 'ScheduledTriggerNode';

// 3. Webhook Trigger
export const WebhookTriggerNode = memo(({ data, selected }: any) => (
  <BaseNodeComponent
    title={data?.label || 'Webhook Trigger'}
    subtitle="Inbound HTTP payload"
    category="Trigger"
    icon={Webhook}
    color="bg-indigo-700"
    hasInput={false}
    hasOutput={true}
    status={data?.status}
    selected={selected}
  />
));
WebhookTriggerNode.displayName = 'WebhookTriggerNode';

// 4. Text Input
export const TextInputNode = memo(({ data, selected }: any) => (
  <BaseNodeComponent
    title={data?.label || 'Text Ingestion'}
    subtitle={data?.field_name || 'Payload field'}
    category="Input"
    icon={FileText}
    color="bg-slate-700"
    status={data?.status}
    selected={selected}
  />
));
TextInputNode.displayName = 'TextInputNode';

// 5. Document Retrieval (RAG)
export const DocumentRetrievalNode = memo(({ data, selected }: any) => (
  <BaseNodeComponent
    title={data?.label || 'Knowledge Retrieval'}
    subtitle={`Top ${data?.top_k || 3} relevant chunks`}
    category="RAG Search"
    icon={Search}
    color="bg-emerald-700"
    status={data?.status}
    selected={selected}
  />
));
DocumentRetrievalNode.displayName = 'DocumentRetrievalNode';

// 6. LLM Processing
export const LLMProcessingNode = memo(({ data, selected }: any) => (
  <BaseNodeComponent
    title={data?.label || 'LLM Agent / Classifier'}
    subtitle={data?.model || 'gpt-4o-mini'}
    category="AI Reasoning"
    icon={Sparkles}
    color="bg-purple-700"
    status={data?.status}
    selected={selected}
  />
));
LLMProcessingNode.displayName = 'LLMProcessingNode';

// 7. Conditional Branch
export const ConditionalBranchNode = memo(({ data, selected }: any) => (
  <BaseNodeComponent
    title={data?.label || 'Conditional Branch'}
    subtitle={`If ${data?.condition_variable || 'condition'} == ${data?.value || 'val'}`}
    category="Logic Flow"
    icon={GitFork}
    color="bg-amber-600"
    isBranch={true}
    status={data?.status}
    selected={selected}
  />
));
ConditionalBranchNode.displayName = 'ConditionalBranchNode';

// 8. HTTP Request
export const HTTPRequestNode = memo(({ data, selected }: any) => (
  <BaseNodeComponent
    title={data?.label || 'HTTP Request'}
    subtitle={`${data?.method || 'GET'} (SSRF Protected)`}
    category="External Tool"
    icon={Globe}
    color="bg-cyan-700"
    status={data?.status}
    selected={selected}
  />
));
HTTPRequestNode.displayName = 'HTTPRequestNode';

// 9. Email Draft
export const EmailDraftNode = memo(({ data, selected }: any) => (
  <BaseNodeComponent
    title={data?.label || 'Email Draft'}
    subtitle={data?.recipient || 'Prepared for review'}
    category="Action"
    icon={Mail}
    color="bg-rose-700"
    status={data?.status}
    selected={selected}
  />
));
EmailDraftNode.displayName = 'EmailDraftNode';

// 10. Human Approval Gate
export const HumanApprovalNode = memo(({ data, selected }: any) => (
  <BaseNodeComponent
    title={data?.label || 'Human Approval Gate'}
    subtitle="Action pauses for sign-off"
    category="Governance"
    icon={UserCheck}
    color="bg-orange-600"
    status={data?.status}
    selected={selected}
  />
));
HumanApprovalNode.displayName = 'HumanApprovalNode';

// 11. Data Transformation
export const DataTransformationNode = memo(({ data, selected }: any) => (
  <BaseNodeComponent
    title={data?.label || 'Data Transform'}
    subtitle="JSON mapping / mutation"
    category="Data"
    icon={Cpu}
    color="bg-teal-800"
    status={data?.status}
    selected={selected}
  />
));
DataTransformationNode.displayName = 'DataTransformationNode';

// 12. End / Output
export const EndOutputNode = memo(({ data, selected }: any) => (
  <BaseNodeComponent
    title={data?.label || 'End / Final Output'}
    subtitle="Terminates workflow run"
    category="Termination"
    icon={CheckCircle}
    color="bg-emerald-800"
    hasOutput={false}
    status={data?.status}
    selected={selected}
  />
));
EndOutputNode.displayName = 'EndOutputNode';

export const nodeTypes = {
  manualTrigger: ManualTriggerNode,
  scheduledTrigger: ScheduledTriggerNode,
  webhookTrigger: WebhookTriggerNode,
  textInput: TextInputNode,
  documentRetrieval: DocumentRetrievalNode,
  llmProcessing: LLMProcessingNode,
  conditionalBranch: ConditionalBranchNode,
  httpRequest: HTTPRequestNode,
  emailDraft: EmailDraftNode,
  humanApproval: HumanApprovalNode,
  dataTransformation: DataTransformationNode,
  endOutput: EndOutputNode,
};
