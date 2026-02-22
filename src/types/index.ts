export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
  result?: string;
  success?: boolean;
  duration?: number;
}

export interface Session {
  id: string;
  name: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ChatState {
  messages: Message[];
  sessions: Session[];
  currentSessionId: string | null;
  loading: boolean;
  streaming: boolean;
  error: string | null;
}

export interface SwarmMessage {
  id: string;
  runId: string;
  taskId: string;
  author: string;
  authorType: 'agent' | 'user' | 'system';
  messageType: MessageType;
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export type MessageType = 
  | 'task_assignment'
  | 'task_status'
  | 'task_progress'
  | 'task_completion'
  | 'task_failure'
  | 'consensus_request'
  | 'consensus_response'
  | 'disagreement'
  | 'clarification'
  | 'correction'
  | 'info';

export interface SwarmTask {
  id: string;
  runId: string;
  agentName: string;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  depth: number;
  createdAt: number;
  updatedAt: number;
}

export interface ConsensusState {
  taskId: string;
  status: 'pending' | 'agreed' | 'disagreed';
  participants: string[];
  agreements: string[];
  disagreements: string[];
  resolution?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'created' | 'running' | 'paused' | 'stopped' | 'completed' | 'waiting_for_boss_approval';
  roles: string[];
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowStep {
  name: string;
  description: string;
  assignedTo: string;
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  author: string;
  createdAt: number;
}

export interface SystemStatus {
  running: boolean;
  sessionId: string | null;
  model: string;
  provider: string;
  gatewayAvailable?: boolean;
  workspaceDir?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface AppConfig {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'zh';
  provider: string;
  model: string;
  apiKey: string;
  workspaceDir: string;
  autoSave: boolean;
  maxHistoryMessages: number;
}

// ============ Prompt Optimization Types ============

/**
 * 任务类型枚举
 * 用于分析用户消息并确定适当的 prompt 压缩级别
 */
export type TaskType = 
  | 'quick'        // 快速问答 - 简单问题，不需要工具
  | 'simple'       // 单工具操作 - 单一工具调用
  | 'standard'     // 标准任务 - 需要多个工具
  | 'complex'      // 复杂多步骤 - 需要规划和执行
  | 'technical'    // 技术实现 - 代码、调试、优化
  | 'creative'     // 创意生成 - 内容创作
  | 'conversation' // 对话交互 - 聊天、讨论
  | 'orchestrator' // 多智能体编排 - 协调多个子任务

/**
 * 压缩级别枚举
 * 控制 prompt 内容的压缩程度
 */
export type CompressionLevel = 
  | 'minimal'      // 最小压缩 - 保持原样
  | 'light'        // 轻度压缩 - 移除部分细节
  | 'moderate'     // 中度压缩 - 压缩工具列表和人格描述
  | 'aggressive'   // 激进压缩 - 只保留最基本信息

/**
 * Prompt 组件类型
 * 标识 prompt 中包含的各个组成部分
 */
export type PromptComponent = 
  | 'soul'         // 完整人格描述
  | 'identity'     // 简短身份标识
  | 'tools'        // 工具列表
  | 'task'         // 任务说明
  | 'safety'       // 安全规则
  | 'skills'       // 技能列表
  | 'workspace'    // 工作区信息
  | 'runtime'      // 运行时信息
  | 'memory'       // 记忆上下文
  | 'experience'   // 经验知识

/**
 * 优化后的 Prompt 结果
 * 包含优化后的系统提示和元数据
 */
export interface OptimizedPrompt {
  /** 优化后的系统提示内容 */
  systemPrompt: string;
  /** 分析得出的任务类型 */
  taskType: TaskType;
  /** 压缩比率 (0-1) */
  compressionRatio: number;
  /** 包含的 prompt 组件列表 */
  componentsIncluded: PromptComponent[];
}

/**
 * Prompt 优化配置
 * 控制优化器的行为
 */
export interface PromptOptimizerConfig {
  /** 是否启用压缩 */
  enableCompression: boolean;
  /** 系统提示最大字符数 */
  maxSystemPromptChars: number;
  /** 是否优先简洁 */
  preferConcise: boolean;
}

// ============ Workflow Phase Types ============

/**
 * 阶段状态类型
 * 描述工作流阶段的当前状态
 */
export type PhaseStatusType = 
  | 'pending'                    // 等待开始
  | 'in_progress'                // 进行中
  | 'waiting_for_dependencies'   // 等待依赖
  | 'waiting_for_approval'       // 等待审批
  | 'waiting_for_consensus'      // 等待共识
  | 'completed'                  // 已完成
  | 'needs_adjustment';          // 需要调整

/**
 * 可交付物类型
 */
export type DeliverableType = 'document' | 'code' | 'test' | 'review' | 'deployment';

/**
 * 可交付物状态
 */
export type DeliverableStatus = 'pending' | 'in_progress' | 'completed';

/**
 * 可交付物
 * 工作流阶段产出的具体成果
 */
export interface Deliverable {
  /** 唯一标识 */
  id: string;
  /** 名称 */
  name: string;
  /** 类型 */
  type: DeliverableType;
  /** 状态 */
  status: DeliverableStatus;
  /** 文件路径 */
  path?: string;
  /** 描述 */
  description?: string;
}

/**
 * 工作流阶段
 * Scrum 工作流中的具体阶段
 */
export interface WorkflowPhaseDetail {
  /** 阶段 ID */
  id: string;
  /** 阶段名称 */
  name: string;
  /** 阶段描述 */
  description: string;
  /** 阶段状态 */
  status: PhaseStatusType;
  /** 完成进度 (0-1) */
  progress: number;
  /** 开始时间 */
  startedAt?: number;
  /** 预计完成时间 */
  estimatedCompletion?: number;
  /** 实际完成时间 */
  completedAt?: number;
  /** 依赖的阶段 ID 列表 */
  dependencies: string[];
  /** 可交付物列表 */
  deliverables: Deliverable[];
  /** 分配给的成员 */
  assignedTo: string[];
}

/**
 * 审批类型
 */
export type ApprovalType = 
  | 'boss_approval'      // Boss 审批
  | 'peer_review'        // 同行评审
  | 'stakeholder'        // 利益相关者
  | 'automated';         // 自动审批

/**
 * 投票状态
 * 用于共识决策
 */
export interface VoteStatus {
  /** 总投票人数 */
  totalVoters: number;
  /** 赞成票数 */
  votesFor: number;
  /** 反对票数 */
  votesAgainst: number;
  /** 所需多数比例 */
  requiredMajority: number;
  /** 截止时间 */
  deadline?: number;
}

/**
 * 阶段转换请求
 */
export interface PhaseTransition {
  /** 源阶段 */
  fromPhase: string;
  /** 目标阶段 */
  toPhase: string;
  /** 转换原因 */
  reason?: string;
  /** 附带的可交付物 */
  deliverables?: Deliverable[];
}

/**
 * 审批请求
 */
export interface ApprovalRequest {
  /** 请求 ID */
  id: string;
  /** 审批类型 */
  type: ApprovalType;
  /** 请求者 */
  requester: string;
  /** 审批者 */
  approver: string;
  /** 相关阶段 */
  phase: string;
  /** 请求原因 */
  reason: string;
  /** 审批状态 */
  status: 'pending' | 'approved' | 'rejected';
  /** 创建时间 */
  createdAt: number;
  /** 响应时间 */
  respondedAt?: number;
  /** 审批意见 */
  comment?: string;
}

/**
 * 工作流上下文
 * 包含工作流执行的完整状态
 */
export interface WorkflowContext {
  /** 工作流 ID */
  workflowId: string;
  /** 当前阶段 */
  currentPhase: string;
  /** 所有阶段 */
  phases: WorkflowPhaseDetail[];
  /** 已完成的任务 ID */
  completedTasks: string[];
  /** 待处理的审批请求 */
  pendingApprovals: ApprovalRequest[];
}

// ============ Soul Injection Strategy Types ============

/**
 * Soul 注入策略
 * 控制何时注入完整人格描述
 */
export interface SoulInjectionStrategy {
  /** 完整人格注入的任务类型 */
  fullInjectionTypes: TaskType[];
  /** 简短身份注入的任务类型 */
  identityOnlyTypes: TaskType[];
  /** 不注入身份的任务类型 */
  noInjectionTypes: TaskType[];
}

/**
 * Soul 配置
 */
export interface SoulConfig {
  /** 是否启用 Soul */
  enabled: boolean;
  /** Soul 预设名称 */
  preset: string;
  /** 注入策略 */
  injectionStrategy: SoulInjectionStrategy;
}
