# ZeroClaw Desktop API 设计文档

## 1. API 概述

ZeroClaw Desktop 通过 Electron 的 IPC（进程间通信）机制，在渲染进程和主进程之间建立通信桥梁。所有 API 通过 `window.zeroclaw` 对象暴露给渲染进程。

### 1.1 API 访问方式

```typescript
// 在渲染进程中访问
const result = await window.zeroclaw.chat.send('Hello');
```

### 1.2 API 分类

| 模块 | 用途 | 说明 |
|------|------|------|
| `chat` | 对话管理 | 消息发送、会话管理 |
| `swarm` | 智能体群聊 | 任务查看、消息监控 |
| `workflow` | 工作流管理 | 创建、控制工作流 |
| `system` | 系统控制 | 启停、配置管理 |

## 2. Chat API

### 2.1 发送消息

**方法签名：**
```typescript
chat.send(message: string, sessionId?: string): Promise<{ success: boolean }>
```

**参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | 是 | 用户消息内容 |
| sessionId | string | 否 | 会话ID，不传则使用当前会话或创建新会话 |

**返回值：**
```typescript
{
  success: boolean;  // 发送是否成功
}
```

**示例：**
```typescript
// 发送消息到当前会话
await window.zeroclaw.chat.send('你好，请帮我分析这段代码');

// 发送消息到指定会话
await window.zeroclaw.chat.send('继续', 'session-123');
```

**错误处理：**
```typescript
try {
  await window.zeroclaw.chat.send('Hello');
} catch (error) {
  // ZeroClaw 未运行时抛出错误
  console.error('发送失败:', error.message);
}
```

### 2.2 中止会话

**方法签名：**
```typescript
chat.abort(sessionId: string): Promise<{ success: boolean }>
```

**参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 要中止的会话ID |

**返回值：**
```typescript
{
  success: boolean;  // 中止是否成功
}
```

### 2.3 获取历史消息

**方法签名：**
```typescript
chat.history(sessionId: string, limit?: number): Promise<Message[]>
```

**参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 会话ID |
| limit | number | 否 | 返回消息数量，默认100 |

**返回值：**
```typescript
interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  name: string;
  arguments: Record<string, any>;
  result?: string;
  success?: boolean;
  duration?: number;
}
```

### 2.4 会话管理

#### 2.4.1 列出会话

```typescript
chat.sessions.list(): Promise<Session[]>

interface Session {
  id: string;
  name: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
}
```

#### 2.4.2 创建会话

```typescript
chat.sessions.create(name?: string): Promise<Session>
```

#### 2.4.3 删除会话

```typescript
chat.sessions.delete(sessionId: string): Promise<void>
```

#### 2.4.4 重命名会话

```typescript
chat.sessions.rename(sessionId: string, name: string): Promise<void>
```

### 2.5 事件订阅

#### 2.5.1 消息事件

```typescript
chat.onMessage(callback: (message: Message) => void): () => void
```

**返回值：** 取消订阅函数

**示例：**
```typescript
const unsubscribe = window.zeroclaw.chat.onMessage((msg) => {
  console.log('收到消息:', msg);
});

// 取消订阅
unsubscribe();
```

#### 2.5.2 工具调用事件

```typescript
chat.onToolCall(callback: (call: ToolCall) => void): () => void
```

#### 2.5.3 状态事件

```typescript
chat.onStatus(callback: (status: ChatStatus) => void): () => void

interface ChatStatus {
  streaming?: boolean;  // 是否正在流式输出
  loading?: boolean;    // 是否正在加载
}
```

## 3. Swarm API

### 3.1 列出任务

**方法签名：**
```typescript
swarm.listTasks(): Promise<SwarmTask[]>
```

**返回值：**
```typescript
interface SwarmTask {
  id: string;
  runId: string;        // 运行ID，同一运行中的任务共享
  agentName: string;    // 执行任务的智能体名称
  task: string;         // 任务描述
  status: 'pending' | 'running' | 'completed' | 'failed';
  depth: number;        // 任务深度（层级）
  createdAt: number;
  updatedAt: number;
}
```

### 3.2 获取任务详情

**方法签名：**
```typescript
swarm.getTask(taskId: string): Promise<SwarmTask | null>
```

### 3.3 获取消息

**方法签名：**
```typescript
swarm.getMessages(
  runId?: string, 
  taskId?: string, 
  limit?: number
): Promise<SwarmMessage[]>
```

**参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| runId | string | 否 | 运行ID，筛选特定运行的消息 |
| taskId | string | 否 | 任务ID，筛选特定任务的消息 |
| limit | number | 否 | 返回消息数量，默认100 |

**返回值：**
```typescript
interface SwarmMessage {
  id: string;
  runId: string;
  taskId: string;
  author: string;       // 消息作者（智能体名称）
  authorType: 'agent' | 'user' | 'system';
  messageType: MessageType;
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

type MessageType = 
  | 'task_assignment'     // 任务分配
  | 'task_status'         // 任务状态更新
  | 'task_progress'       // 任务进度
  | 'task_completion'     // 任务完成
  | 'task_failure'        // 任务失败
  | 'consensus_request'   // 共识请求
  | 'consensus_response'  // 共识响应
  | 'disagreement'        // 分歧
  | 'clarification'       // 澄清
  | 'correction'          // 纠正
  | 'info';               // 信息
```

### 3.4 获取共识状态

**方法签名：**
```typescript
swarm.getConsensus(taskId: string): Promise<ConsensusState | null>
```

**返回值：**
```typescript
interface ConsensusState {
  taskId: string;
  status: 'pending' | 'agreed' | 'disagreed';
  participants: string[];     // 参与者列表
  agreements: string[];       // 同意者列表
  disagreements: string[];    // 反对者列表
  resolution?: string;        // 解决方案
}
```

### 3.5 事件订阅

#### 3.5.1 消息事件

```typescript
swarm.onMessage(callback: (message: SwarmMessage) => void): () => void
```

#### 3.5.2 共识事件

```typescript
swarm.onConsensus(callback: (state: ConsensusState) => void): () => void
```

#### 3.5.3 任务更新事件

```typescript
swarm.onTaskUpdate(callback: (task: SwarmTask) => void): () => void
```

## 4. Workflow API

### 4.1 列出工作流

**方法签名：**
```typescript
workflow.list(): Promise<Workflow[]>
```

**返回值：**
```typescript
interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  roles: string[];       // 角色列表（智能体名称）
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
}

type WorkflowStatus = 
  | 'created'                    // 已创建
  | 'running'                    // 运行中
  | 'paused'                     // 已暂停
  | 'stopped'                    // 已停止
  | 'completed'                  // 已完成
  | 'waiting_for_boss_approval'; // 等待审批

interface WorkflowStep {
  name: string;
  description: string;
  assignedTo: string;     // 分配的角色
  dependencies: string[]; // 依赖的步骤名称
  status: 'pending' | 'running' | 'completed' | 'failed';
}
```

### 4.2 获取工作流

**方法签名：**
```typescript
workflow.get(id: string): Promise<Workflow | null>
```

### 4.3 创建工作流

**方法签名：**
```typescript
workflow.create(config: WorkflowConfig): Promise<Workflow>

interface WorkflowConfig {
  name: string;
  description: string;
  roles: string[];
  steps: Omit<WorkflowStep, 'status'>[];
}
```

**示例：**
```typescript
const workflow = await window.zeroclaw.workflow.create({
  name: '代码审查流程',
  description: '自动化代码审查工作流',
  roles: ['reviewer', 'tester', 'approver'],
  steps: [
    {
      name: '代码检查',
      description: '检查代码质量',
      assignedTo: 'reviewer',
      dependencies: []
    },
    {
      name: '测试验证',
      description: '运行测试用例',
      assignedTo: 'tester',
      dependencies: ['代码检查']
    },
    {
      name: '最终审批',
      description: '审批通过',
      assignedTo: 'approver',
      dependencies: ['测试验证']
    }
  ]
});
```

### 4.4 自动生成工作流

**方法签名：**
```typescript
workflow.autoGenerate(prompt: string): Promise<Workflow>
```

**参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| prompt | string | 是 | 描述工作流需求的自然语言提示 |

**示例：**
```typescript
const workflow = await window.zeroclaw.workflow.autoGenerate(
  '创建一个敏捷开发冲刺流程，包含需求分析、开发、测试、部署四个阶段'
);
```

### 4.5 工作流控制

#### 4.5.1 启动工作流

```typescript
workflow.start(id: string): Promise<{ success: boolean }>
```

#### 4.5.2 暂停工作流

```typescript
workflow.pause(id: string): Promise<{ success: boolean }>
```

#### 4.5.3 恢复工作流

```typescript
workflow.resume(id: string): Promise<{ success: boolean }>
```

#### 4.5.4 停止工作流

```typescript
workflow.stop(id: string): Promise<{ success: boolean }>
```

### 4.6 获取工作流状态

**方法签名：**
```typescript
workflow.status(id: string): Promise<WorkflowStatusInfo>

interface WorkflowStatusInfo {
  id: string;
  name: string;
  status: WorkflowStatus;
  progress: number;        // 进度百分比 (0-100)
  currentStep?: WorkflowStep;  // 当前执行的步骤
}
```

### 4.7 工作流模板

#### 4.7.1 列出模板

```typescript
workflow.templates.list(): Promise<WorkflowTemplate[]>

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  author: string;
  createdAt: number;
}
```

#### 4.7.2 获取模板

```typescript
workflow.templates.get(id: string): Promise<WorkflowTemplate | null>
```

### 4.8 事件订阅

```typescript
workflow.onUpdate(callback: (workflow: Workflow) => void): () => void
```

## 5. System API

### 5.1 获取系统状态

**方法签名：**
```typescript
system.getStatus(): Promise<SystemStatus>
```

**返回值：**
```typescript
interface SystemStatus {
  running: boolean;       // ZeroClaw 是否运行中
  sessionId: string | null;  // 当前会话ID
  model: string;          // 使用的模型
  provider: string;       // AI 提供商
  tokenUsage?: {          // Token 使用统计
    prompt: number;
    completion: number;
    total: number;
  };
}
```

### 5.2 配置管理

#### 5.2.1 获取配置

```typescript
system.getConfig(): Promise<AppConfig>

interface AppConfig {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'zh';
  provider: string;       // AI 提供商
  model: string;          // 模型名称
  apiKey: string;         // API 密钥
  workspaceDir: string;   // 工作目录
  autoSave: boolean;      // 自动保存
  maxHistoryMessages: number;  // 最大历史消息数
}
```

#### 5.2.2 设置配置

```typescript
system.setConfig(config: Partial<AppConfig>): Promise<void>
```

**示例：**
```typescript
await window.zeroclaw.system.setConfig({
  theme: 'dark',
  language: 'zh',
  maxHistoryMessages: 200
});
```

### 5.3 进程控制

#### 5.3.1 启动 ZeroClaw

```typescript
system.startZeroClaw(): Promise<{ status: string }>
```

**返回值：**
```typescript
{
  status: 'started' | 'already_running';
}
```

#### 5.3.2 停止 ZeroClaw

```typescript
system.stopZeroClaw(): Promise<void>
```

### 5.4 日志订阅

```typescript
system.onLog(callback: (log: LogEntry) => void): () => void

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp?: number;
}
```

## 6. 全局事件

### 6.1 动作事件

主进程可以向渲染进程发送动作指令：

```typescript
window.zeroclaw.onAction((action: string, data?: any) => {
  switch (action) {
    case 'new-chat':
      // 创建新对话
      break;
    case 'show-notification':
      // 显示通知
      break;
  }
});
```

## 7. 类型定义

### 7.1 完整类型文件

```typescript
// src/types/index.ts

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
```

## 8. 错误处理

### 8.1 错误类型

| 错误 | 说明 | 处理建议 |
|------|------|----------|
| `ZeroClaw is not running` | ZeroClaw 进程未启动 | 调用 `system.startZeroClaw()` |
| `Session not found` | 会话不存在 | 检查 sessionId 是否正确 |
| `Network error` | 网络错误 | 检查网络连接 |
| `Invalid parameters` | 参数无效 | 检查参数类型和格式 |

### 8.2 错误处理示例

```typescript
async function sendMessage(content: string) {
  try {
    const result = await window.zeroclaw.chat.send(content);
    if (!result.success) {
      console.error('发送失败');
    }
  } catch (error) {
    if (error.message === 'ZeroClaw is not running') {
      // 尝试启动 ZeroClaw
      await window.zeroclaw.system.startZeroClaw();
      // 重试发送
      await window.zeroclaw.chat.send(content);
    } else {
      throw error;
    }
  }
}
```

## 9. API 使用最佳实践

### 9.1 事件订阅管理

```typescript
// 使用 useEffect 管理订阅生命周期
useEffect(() => {
  const unsubscribe = window.zeroclaw.chat.onMessage(handleMessage);
  return () => unsubscribe();
}, []);
```

### 9.2 批量操作

```typescript
// 避免频繁 IPC 调用
const sessions = await window.zeroclaw.chat.sessions.list();
const allMessages = await Promise.all(
  sessions.map(s => window.zeroclaw.chat.history(s.id, 10))
);
```

### 9.3 状态同步

```typescript
// 先订阅事件，再加载数据，确保不丢失事件
const unsubscribe = window.zeroclaw.chat.onMessage(updateStore);
const messages = await window.zeroclaw.chat.history(sessionId);
setMessages(messages);
```
