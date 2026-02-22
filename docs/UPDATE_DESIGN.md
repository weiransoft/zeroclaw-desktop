# ZeroClaw Desktop 更新设计方案

## 一、概述

本文档描述 ZeroClaw Desktop 应用需要进行的更新，以匹配 ZeroClaw 后端的最新功能。

---

## 二、需要新增的功能模块

### 2.1 Prompt 优化系统支持

**新增类型定义** (`src/types/index.ts`):

```typescript
// 任务类型枚举
export type TaskType = 
  | 'quick'        // 快速问答
  | 'simple'       // 单工具操作
  | 'standard'     // 标准任务
  | 'complex'      // 复杂多步骤
  | 'technical'    // 技术实现
  | 'creative'     // 创意生成
  | 'conversation' // 对话交互
  | 'orchestrator' // 多智能体编排

// 压缩级别枚举
export type CompressionLevel = 
  | 'minimal'      // 最小压缩
  | 'light'        // 轻度压缩
  | 'moderate'     // 中度压缩
  | 'aggressive'   // 激进压缩

// Prompt 组件类型
export type PromptComponent = 
  | 'soul'         // 人格描述
  | 'identity'     // 身份标识
  | 'tools'        // 工具列表
  | 'task'         // 任务说明
  | 'safety'       // 安全规则
  | 'skills'       // 技能列表
  | 'workspace'    // 工作区信息
  | 'runtime'      // 运行时信息
  | 'memory'       // 记忆上下文
  | 'experience'   // 经验知识

// 优化后的 Prompt 结果
export interface OptimizedPrompt {
  systemPrompt: string
  taskType: TaskType
  compressionRatio: number
  componentsIncluded: PromptComponent[]
}

// Prompt 优化配置
export interface PromptOptimizerConfig {
  enableCompression: boolean
  maxSystemPromptChars: number
  preferConcise: boolean
}
```

**新增 IPC 处理器** (`electron/core/ipc-handlers.ts`):

```typescript
// 获取任务类型分析
ipcMain.handle('prompt:analyze-task', async (_, message: string, tools: string[]) => {
  return bridge.analyzeTask(message, tools);
});

// 获取优化配置
ipcMain.handle('prompt:config', async () => {
  return bridge.getPromptOptimizerConfig();
});

// 设置优化配置
ipcMain.handle('prompt:set-config', async (_, config: PromptOptimizerConfig) => {
  return bridge.setPromptOptimizerConfig(config);
});
```

### 2.2 Scrum 工作流系统支持

**新增类型定义** (`src/types/index.ts`):

```typescript
// 阶段状态类型
export type PhaseStatus = 
  | 'pending'
  | 'in_progress'
  | 'waiting_for_dependencies'
  | 'waiting_for_approval'
  | 'waiting_for_consensus'
  | 'completed'
  | 'needs_adjustment'

// 工作流阶段
export interface WorkflowPhase {
  id: string
  name: string
  description: string
  status: PhaseStatus
  progress: number
  startedAt?: number
  estimatedCompletion?: number
  completedAt?: number
  dependencies: string[]
  deliverables: Deliverable[]
  assignedTo: string[]
}

// 可交付物
export interface Deliverable {
  id: string
  name: string
  type: 'document' | 'code' | 'test' | 'review' | 'deployment'
  status: 'pending' | 'in_progress' | 'completed'
  path?: string
  description?: string
}

// 审批类型
export type ApprovalType = 
  | 'boss_approval'      // Boss 审批
  | 'peer_review'        // 同行评审
  | 'stakeholder'        // 利益相关者
  | 'automated'          // 自动审批

// 投票状态
export interface VoteStatus {
  totalVoters: number
  votesFor: number
  votesAgainst: number
  requiredMajority: number
  deadline?: number
}

// 阶段转换请求
export interface PhaseTransition {
  fromPhase: string
  toPhase: string
  reason?: string
  deliverables?: Deliverable[]
}

// 工作流上下文
export interface WorkflowContext {
  workflowId: string
  currentPhase: string
  phases: WorkflowPhase[]
  completedTasks: string[]
  pendingApprovals: ApprovalRequest[]
}

// 审批请求
export interface ApprovalRequest {
  id: string
  type: ApprovalType
  requester: string
  approver: string
  phase: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: number
  respondedAt?: number
  comment?: string
}
```

**新增 IPC 处理器** (`electron/core/ipc-handlers.ts`):

```typescript
// 获取工作流阶段
ipcMain.handle('workflow:phases:get', async (_, workflowId: string) => {
  return bridge.getWorkflowPhases(workflowId);
});

// 阶段转换
ipcMain.handle('workflow:phase-transition', async (_, workflowId: string, transition: PhaseTransition) => {
  return bridge.transitionPhase(workflowId, transition);
});

// 获取审批请求列表
ipcMain.handle('workflow:approvals:list', async (_, workflowId?: string) => {
  return bridge.listApprovalRequests(workflowId);
});

// 响应审批请求
ipcMain.handle('workflow:approval:respond', async (_, approvalId: string, approved: boolean, comment?: string) => {
  return bridge.respondToApproval(approvalId, approved, comment);
});

// 获取工作流上下文
ipcMain.handle('workflow:context', async (_, workflowId: string) => {
  return bridge.getWorkflowContext(workflowId);
});
```

### 2.3 Soul 注入策略配置

**新增类型定义**:

```typescript
// Soul 注入策略
export interface SoulInjectionStrategy {
  // 完整人格注入的任务类型
  fullInjectionTypes: TaskType[]
  // 简短身份注入的任务类型
  identityOnlyTypes: TaskType[]
  // 不注入身份的任务类型
  noInjectionTypes: TaskType[]
}

// Soul 配置
export interface SoulConfig {
  enabled: boolean
  preset: string
  injectionStrategy: SoulInjectionStrategy
}
```

**新增 IPC 处理器**:

```typescript
// 获取 Soul 注入策略
ipcMain.handle('soul:strategy', async () => {
  return bridge.getSoulInjectionStrategy();
});

// 设置 Soul 注入策略
ipcMain.handle('soul:set-strategy', async (_, strategy: SoulInjectionStrategy) => {
  return bridge.setSoulInjectionStrategy(strategy);
});
```

---

## 三、Bridge 更新

### 3.1 新增方法 (`electron/core/zeroclaw-bridge.ts`)

```typescript
// Prompt 优化相关
async analyzeTask(message: string, tools: string[]): Promise<TaskType>
async getPromptOptimizerConfig(): Promise<PromptOptimizerConfig>
async setPromptOptimizerConfig(config: PromptOptimizerConfig): Promise<void>

// 工作流阶段相关
async getWorkflowPhases(workflowId: string): Promise<WorkflowPhase[]>
async transitionPhase(workflowId: string, transition: PhaseTransition): Promise<void>
async getWorkflowContext(workflowId: string): Promise<WorkflowContext>

// 审批相关
async listApprovalRequests(workflowId?: string): Promise<ApprovalRequest[]>
async respondToApproval(approvalId: string, approved: boolean, comment?: string): Promise<void>

// Soul 策略相关
async getSoulInjectionStrategy(): Promise<SoulInjectionStrategy>
async setSoulInjectionStrategy(strategy: SoulInjectionStrategy): Promise<void>
```

---

## 四、UI 组件更新

### 4.1 工作流阶段视图组件

新增组件显示工作流阶段状态：
- 阶段进度条
- 阶段状态指示器
- 可交付物列表
- 审批请求卡片

### 4.2 Prompt 优化配置面板

新增设置面板：
- 启用/禁用压缩开关
- 最大 Prompt 长度设置
- Soul 注入策略配置

### 4.3 审批管理界面

新增审批管理：
- 待审批列表
- 审批历史
- 审批响应表单

---

## 五、实施步骤

1. **类型定义更新** - 添加新的 TypeScript 类型
2. **Bridge 更新** - 添加新的 API 方法
3. **IPC 处理器更新** - 注册新的 IPC 处理器
4. **UI 组件开发** - 开发新的界面组件
5. **测试验证** - 确保功能正常工作

---

## 六、API 端点映射

| 功能 | Gateway 端点 | Desktop IPC |
|------|-------------|-------------|
| 任务分析 | POST /prompt/analyze | prompt:analyze-task |
| 优化配置获取 | GET /prompt/config | prompt:config |
| 优化配置设置 | POST /prompt/config | prompt:set-config |
| 工作流阶段 | GET /workflow/:id/phases | workflow:phases:get |
| 阶段转换 | POST /workflow/:id/transition | workflow:phase-transition |
| 审批列表 | GET /workflow/approvals | workflow:approvals:list |
| 审批响应 | POST /workflow/approval/:id/respond | workflow:approval:respond |
| Soul 策略 | GET/POST /soul/strategy | soul:strategy / soul:set-strategy |
