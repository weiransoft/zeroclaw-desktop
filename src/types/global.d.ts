import { Message, Session, SwarmMessage, SwarmTask, ConsensusState, Workflow, WorkflowTemplate, SystemStatus } from './index';

// 可观测性相关类型

/**
 * 推理类型
 */
export type ReasoningType =
  | 'problem_understanding'
  | 'information_gathering'
  | 'hypothesis_generation'
  | 'hypothesis_validation'
  | 'decision_making'
  | 'planning'
  | 'execution_monitoring'
  | 'result_evaluation'
  | 'error_correction';

/**
 * 决策类型
 */
export type DecisionType =
  | 'tool_selection'
  | 'parameter_determination'
  | 'task_decomposition'
  | 'prioritization'
  | 'error_handling_strategy'
  | 'termination_judgment'
  | 'subtask_delegation'
  | 'other';

/**
 * 时间范围
 */
export type TimeRange = '1h' | '24h' | '7d' | '30d' | 'custom';

/**
 * 趋势数据点
 */
export interface TrendDataPoint {
  time: number;
  value: number;
}

/**
 * 聚合查询类型
 */
export type AggregationQuery =
  | { type: 'success_rate'; timeRange?: [number, number] }
  | { type: 'average_duration'; timeRange?: [number, number] }
  | { type: 'trace_type_distribution'; timeRange?: [number, number] }
  | { type: 'token_usage'; timeRange?: [number, number] }
  | { type: 'cost_stats'; timeRange?: [number, number] };

/**
 * 聚合结果
 */
export type AggregationResult =
  | { type: 'success_rate'; total: number; success: number; rate: number }
  | { type: 'average_duration'; avgMs: number; minMs: number; maxMs: number }
  | { type: 'trace_type_distribution'; distribution: Array<{ type: string; count: number }> }
  | { type: 'token_usage'; totalPrompt: number; totalCompletion: number; total: number }
  | { type: 'cost_stats'; totalCost: number; avgCostPerTrace: number }
  | { type: 'unknown' };

export interface TraceType {
  type: 'user_message' | 'llm_call' | 'tool_call' | 'sub_agent_call' | 'phase_transition' | 'approval_request' | 'system_event' | 'error';
  provider?: string;
  model?: string;
  tool?: string;
  action?: string;
  agentName?: string;
  task?: string;
  from?: string;
  to?: string;
  approvalType?: string;
  event?: string;
  component?: string;
  errorType?: string;
}

export interface TraceInput {
  content: string;
  contentType: 'text' | 'json' | 'image';
  params: Record<string, unknown>;
}

export interface TraceOutput {
  content: string;
  success: boolean;
  error?: string;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  costUsd?: number;
}

export interface AgentTrace {
  id: string;
  runId: string;
  parentId?: string;
  timestamp: number;
  durationMs: number;
  traceType: TraceType;
  input: TraceInput;
  output: TraceOutput;
  metadata: Record<string, unknown>;
  reasoning?: ReasoningChain;
  decision?: DecisionPoint;
  evaluation?: EvaluationResult;
}

export interface ReasoningStep {
  step: number;
  reasoningType: string;
  content: string;
  evidence: string[];
  hypotheses: string[];
  timestamp?: number;
}

export interface ReasoningChain {
  steps: ReasoningStep[];
  conclusion?: string;
  confidence?: number;
  qualityScore?: number;
}

export interface DecisionAlternative {
  id: string;
  description: string;
  pros: string[];
  cons: string[];
  estimatedCost?: number;
  estimatedDurationMs?: number;
}

export interface DecisionQuality {
  isOptimal: boolean;
  score: number;
  improvementSuggestions: string[];
}

export interface DecisionPoint {
  id: string;
  decisionType: string;
  description: string;
  alternatives: DecisionAlternative[];
  chosenAlternativeId: string;
  rationale?: string;
  quality: DecisionQuality;
  timestamp: number;
}

export interface EvaluationResult {
  traceId: string;
  overallScore: number;
  decisionScores: Array<{ decisionId: string; score: number }>;
  reasoningQuality: number;
  efficiencyScore: number;
  errorRate: number;
  suggestions: string[];
  evaluatedAt: number;
}

export interface TraceQuery {
  text?: string;
  runId?: string;
  traceType?: string;
  timeRange?: [number, number];
  success?: boolean;
  minDurationMs?: number;
  maxDurationMs?: number;
  limit?: number;
  offset?: number;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  timestamp: number;
  traceId?: string;
}

export interface FailurePattern {
  patternId: string;
  description: string;
  frequency: number;
  affectedTraces: string[];
  rootCause?: string;
  suggestedFix?: string;
}

export interface DashboardStats {
  totalTraces: number;
  successRate: number;
  avgDurationMs: number;
  totalCost: number;
  tracesTrend: number;
  successRateTrend: number;
  durationTrend: number;
  costTrend: number;
  traceTrend: Array<{ time: number; value: number }>;
  successRateTrendData: Array<{ time: number; value: number }>;
  decisionQualityDistribution: Array<{ range: string; count: number }>;
  toolUsage: Array<{ tool: string; count: number }>;
  alerts: Alert[];
  failurePatterns: FailurePattern[];
}

export interface ObservabilityAPI {
  listTraces: (query: TraceQuery) => Promise<AgentTrace[]>;
  getTrace: (id: string) => Promise<AgentTrace>;
  getReasoning: (traceId: string) => Promise<ReasoningChain | null>;
  getDecisions: (traceId: string) => Promise<DecisionPoint[]>;
  getEvaluation: (traceId: string) => Promise<EvaluationResult | null>;
  evaluateTrace: (traceId: string) => Promise<EvaluationResult>;
  aggregate: (query: { type: string; timeRange?: [number, number] }) => Promise<any>;
  getDashboardStats: (timeRange: string) => Promise<DashboardStats>;
  getAlerts: (limit: number) => Promise<Alert[]>;
  dismissAlert: (id: string) => Promise<void>;
  getFailurePatterns: () => Promise<FailurePattern[]>;
  onNewTrace?: (callback: (trace: AgentTrace) => void) => () => void;
}

export interface ZeroClawAPI {
  platform: string;
  
  chat: {
    send: (message: string, sessionId?: string) => Promise<{ success: boolean }>;
    abort: (sessionId: string) => Promise<void>;
    history: (sessionId: string, limit?: number) => Promise<Message[]>;
    sessions: {
      list: () => Promise<Session[]>;
      create: (name?: string) => Promise<Session>;
      delete: (id: string) => Promise<void>;
      rename: (id: string, name: string) => Promise<void>;
    };
    onMessage: (callback: (msg: Message) => void) => () => void;
    onToolCall: (callback: (call: any) => void) => () => void;
    onStatus: (callback: (status: any) => void) => () => void;
    onStreamStart?: (callback: (data: any) => void) => () => void;
    onStreamChunk?: (callback: (data: any) => void) => () => void;
    onStreamEnd?: (callback: (data: any) => void) => () => void;
  };

  swarm: {
    listTasks: () => Promise<SwarmTask[]>;
    getTask: (taskId: string) => Promise<SwarmTask>;
    getMessages: (runId?: string, taskId?: string, limit?: number) => Promise<SwarmMessage[]>;
    getConsensus: (taskId: string) => Promise<ConsensusState>;
    onMessage: (callback: (msg: SwarmMessage) => void) => () => void;
    onConsensus: (callback: (state: ConsensusState) => void) => () => void;
    onTaskUpdate: (callback: (task: SwarmTask) => void) => () => void;
  };

  workflow: {
    list: () => Promise<Workflow[]>;
    get: (id: string) => Promise<Workflow>;
    create: (config: any) => Promise<Workflow>;
    start: (id: string) => Promise<void>;
    pause: (id: string) => Promise<void>;
    resume: (id: string) => Promise<void>;
    stop: (id: string) => Promise<void>;
    templates: {
      list: () => Promise<WorkflowTemplate[]>;
      get: (id: string) => Promise<WorkflowTemplate>;
    };
    getRoles: () => Promise<string[]>;
    getTeamMembers: () => Promise<any[]>;
    autoGenerate: (prompt: string) => Promise<any>;
    onUpdate: (callback: (data: any) => void) => () => void;
    getPhases: (id: string) => Promise<any[]>;
    getContext: (id: string) => Promise<any>;
    listApprovals: (workflowId?: string) => Promise<any[]>;
    respondToApproval: (id: string, approved: boolean, comment?: string) => Promise<void>;
  };

  zeroclaw: {
    getConfig: () => Promise<any>;
    getConfigPath: () => Promise<string | null>;
    getConfigSummary: () => Promise<any>;
    getAgents: () => Promise<any[]>;
    setConfigPath: (path: string) => Promise<void>;
    selectConfigFile: () => Promise<{ success: boolean; path: string | null }>;
  };

  llmProviders: {
    list: () => Promise<any[]>;
    set: (providers: any[]) => Promise<void>;
    add: (provider: any) => Promise<void>;
    update: (id: string, data: any) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };

  desktopAgents: {
    list: () => Promise<any[]>;
    set: (agents: any[]) => Promise<void>;
    add: (agent: any) => Promise<void>;
    update: (id: string, data: any) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };

  mcp: {
    list: () => Promise<any[]>;
    get: (id: string) => Promise<any>;
    create: (config: any) => Promise<any>;
    update: (id: string, config: any) => Promise<any>;
    delete: (id: string) => Promise<void>;
    start: (id: string) => Promise<void>;
    stop: (id: string) => Promise<void>;
    tools: (id: string) => Promise<any>;
  };

  promptOptimizer: {
    optimize: (prompt: string, agentName?: string, requirements?: string) => Promise<{ success: boolean; optimizedPrompt?: string; error?: string }>;
    getConfig: () => Promise<any>;
  };

  soul: {
    listPresets: () => Promise<any[]>;
    getPreset: (name: string) => Promise<any>;
    getDefaultStrategy: () => Promise<any>;
  };

  soulTemplates: {
    list: () => Promise<any[]>;
    get: (id: string) => Promise<any>;
    create: (template: any) => Promise<any>;
    update: (id: string, template: any) => Promise<any>;
    delete: (id: string) => Promise<void>;
  };

  cost: {
    summary: () => Promise<any>;
  };

  agentGroups: {
    list: () => Promise<any[]>;
    set: (groups: any[]) => Promise<any>;
    add: (group: any) => Promise<any>;
    update: (id: string, data: any) => Promise<any>;
    remove: (id: string) => Promise<any>;
  };

  roleMappings: {
    list: () => Promise<any[]>;
    create: (mapping: any) => Promise<any>;
    get: (role: string) => Promise<any>;
    update: (role: string, data: any) => Promise<any>;
    delete: (role: string) => Promise<any>;
  };

  prompt: {
    optimize: (prompt: string, agentName?: string, requirements?: string) => Promise<{
      success: boolean;
      optimizedPrompt?: string;
      error?: string;
    }>;
  };

  system: {
    getStatus: () => Promise<SystemStatus>;
    getConfig: () => Promise<any>;
    setConfig: (config: any) => Promise<void>;
    startZeroClaw: () => Promise<any>;
    stopZeroClaw: () => Promise<void>;
    onLog: (callback: (log: any) => void) => () => void;
    getPairingStatus: () => Promise<{ gatewayAvailable: boolean; isPaired: boolean }>;
    pair: (code: string) => Promise<{ success: boolean; error?: string }>;
    setToken: (token: string) => Promise<{ success: boolean; message: string }>;
  };

  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    onMaximizeChange?: (callback: (maximized: boolean) => void) => () => void;
  };

  observability: ObservabilityAPI;
}

declare global {
  interface Window {
    zeroclaw: ZeroClawAPI;
    electron?: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, callback: (data: any) => void) => (() => void) | undefined;
      send: (channel: string, ...args: any[]) => void;
    };
  }
}

export {};
