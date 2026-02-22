# ZeroClaw Desktop 组件设计文档

## 1. 组件概述

ZeroClaw Desktop 采用 React 组件化架构，组件按功能域组织，遵循单一职责原则。

### 1.1 组件目录结构

```
src/components/
├── chat/                    # 对话模块组件
│   ├── ChatView.tsx         # 对话主视图
│   ├── InputBar.tsx         # 输入栏
│   ├── MessageItem.tsx      # 消息项
│   ├── MessageList.tsx      # 消息列表
│   └── SessionList.tsx      # 会话列表
├── swarm/                   # 智能体群聊组件
│   ├── SwarmView.tsx        # 智能体主视图
│   ├── TaskList.tsx         # 任务列表
│   ├── ChatTimeline.tsx     # 消息时间线
│   └── ConsensusPanel.tsx   # 共识面板
├── workflow/                # 工作流组件
│   ├── WorkflowView.tsx     # 工作流主视图
│   ├── WorkflowList.tsx     # 工作流列表
│   ├── WorkflowDetail.tsx   # 工作流详情
│   └── WorkflowCreator.tsx  # 工作流创建器
├── layout/                  # 布局组件
│   ├── Sidebar.tsx          # 侧边栏
│   └── StatusBar.tsx        # 状态栏
├── settings/                # 设置组件
│   └── SettingsView.tsx     # 设置视图
└── ui/                      # 通用 UI 组件
    ├── badge.tsx            # 徽章
    ├── button.tsx           # 按钮
    ├── card.tsx             # 卡片
    └── input.tsx            # 输入框
```

## 2. 布局组件

### 2.1 App 主布局

**文件：** `src/App.tsx`

**职责：** 应用主入口，管理页面路由和整体布局

**结构：**
```
┌──────────────────────────────────────────────────────────┐
│                       App                                 │
├────────────┬─────────────────────────────────────────────┤
│            │                                              │
│  Sidebar   │              Main Content                   │
│            │                                              │
│  (导航)    │   ┌─────────────────────────────────────┐   │
│            │   │                                     │   │
│            │   │   ChatView / SwarmView /            │   │
│            │   │   WorkflowView / SettingsView       │   │
│            │   │                                     │   │
│            │   └─────────────────────────────────────┘   │
├────────────┴─────────────────────────────────────────────┤
│                      StatusBar                            │
└──────────────────────────────────────────────────────────┘
```

**代码示例：**
```tsx
function App() {
  const [activeTab, setActiveTab] = useState('chat');

  const renderContent = () => {
    switch (activeTab) {
      case 'chat': return <ChatView />;
      case 'swarm': return <SwarmView />;
      case 'workflow': return <WorkflowView />;
      case 'settings': return <SettingsView />;
      default: return <ChatView />;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-hidden">
          {renderContent()}
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
```

### 2.2 Sidebar 侧边栏

**文件：** `src/components/layout/Sidebar.tsx`

**Props：**
```typescript
interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}
```

**结构：**
```
┌──────────────┐
│   Logo       │
├──────────────┤
│              │
│  ┌────────┐  │
│  │ Chat   │  │  ← 导航项
│  └────────┘  │
│  ┌────────┐  │
│  │ Swarm  │  │
│  └────────┘  │
│  ┌────────┐  │
│  │Workflow│  │
│  └────────┘  │
│  ┌────────┐  │
│  │Settings│  │
│  └────────┘  │
│              │
├──────────────┤
│   系统状态   │
└──────────────┘
```

**功能：**
- 导航切换
- 显示系统运行状态
- 快捷操作按钮

### 2.3 StatusBar 状态栏

**文件：** `src/components/layout/StatusBar.tsx`

**职责：** 显示系统状态、Token 使用量、连接状态

**结构：**
```
┌──────────────────────────────────────────────────────────┐
│ 🟢 Connected │ Model: GPT-4 │ Tokens: 1,234 │ v0.1.0    │
└──────────────────────────────────────────────────────────┘
```

## 3. 对话组件

### 3.1 ChatView 对话视图

**文件：** `src/components/chat/ChatView.tsx`

**职责：** 对话功能主视图，整合会话列表、消息列表、输入栏

**结构：**
```
┌──────────────────────────────────────────────────────────┐
│                      ChatView                             │
├───────────────┬──────────────────────────────────────────┤
│               │                                          │
│  SessionList  │              MessageList                 │
│               │                                          │
│  ┌──────────┐ │  ┌────────────────────────────────────┐  │
│  │ Session 1│ │  │ User: Hello                        │  │
│  └──────────┘ │  │ Assistant: Hi! How can I help?     │  │
│  ┌──────────┐ │  │ User: ...                          │  │
│  │ Session 2│ │  │ Assistant: ...                     │  │
│  └──────────┘ │  └────────────────────────────────────┘  │
│               │                                          │
│               ├──────────────────────────────────────────┤
│               │              InputBar                    │
│               │  ┌────────────────────────────┬────────┐ │
│               │  │ Type a message...          │ Send   │ │
│               │  └────────────────────────────┴────────┘ │
└───────────────┴──────────────────────────────────────────┘
```

**使用的 Hook：** `useChat`

### 3.2 SessionList 会话列表

**文件：** `src/components/chat/SessionList.tsx`

**Props：**
```typescript
interface SessionListProps {
  sessions: Session[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, name: string) => void;
}
```

**功能：**
- 显示会话列表
- 创建新会话
- 删除会话
- 重命名会话
- 会话搜索/筛选

**交互：**
- 点击选择会话
- 右键菜单（删除、重命名）
- 双击重命名

### 3.3 MessageList 消息列表

**文件：** `src/components/chat/MessageList.tsx`

**Props：**
```typescript
interface MessageListProps {
  messages: Message[];
  loading: boolean;
  streaming: boolean;
}
```

**功能：**
- 渲染消息列表
- 自动滚动到最新消息
- 加载状态指示
- 流式输出显示

**虚拟滚动：** 使用虚拟列表处理大量消息

### 3.4 MessageItem 消息项

**文件：** `src/components/chat/MessageItem.tsx`

**Props：**
```typescript
interface MessageItemProps {
  message: Message;
}
```

**功能：**
- 根据角色渲染不同样式
- Markdown 渲染
- 代码高亮
- 工具调用展示

**结构：**
```
┌──────────────────────────────────────────────────────────┐
│ 👤 User                                           10:30  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  请帮我分析这段代码的性能问题                              │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 🤖 Assistant                                      10:31  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  我来分析一下这段代码...                                   │
│                                                          │
│  ```python                                               │
│  def process_data(items):                                │
│      result = []                                         │
│      for item in items:                                  │
│          result.append(transform(item))                  │
│      return result                                       │
│  ```                                                     │
│                                                          │
│  🔧 Tool Call: analyze_code                              │
│  └─ ✅ Completed in 234ms                                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 3.5 InputBar 输入栏

**文件：** `src/components/chat/InputBar.tsx`

**Props：**
```typescript
interface InputBarProps {
  onSend: (message: string) => void;
  onAbort: () => void;
  disabled: boolean;
  streaming: boolean;
}
```

**功能：**
- 多行文本输入
- 快捷键发送（Enter 发送，Shift+Enter 换行）
- 发送/中止按钮切换
- 字符计数

**结构：**
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Type your message here...                               │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  📎 Attach  │  🎤 Voice  │  0/4000  │  [Send/Aabort]    │
└──────────────────────────────────────────────────────────┘
```

## 4. 智能体群聊组件

### 4.1 SwarmView 智能体视图

**文件：** `src/components/swarm/SwarmView.tsx`

**职责：** 智能体群聊监控主视图

**结构：**
```
┌──────────────────────────────────────────────────────────┐
│                      SwarmView                            │
├───────────────┬──────────────────────────────────────────┤
│               │                                          │
│   TaskList    │             ChatTimeline                 │
│               │                                          │
│  ┌──────────┐ │  ┌────────────────────────────────────┐  │
│  │ Task 1   │ │  │ Agent1: I'll handle the analysis   │  │
│  │ running  │ │  │ Agent2: I can help with testing    │  │
│  └──────────┘ │  │ Agent1: Task completed             │  │
│  ┌──────────┐ │  └────────────────────────────────────┘  │
│  │ Task 2   │ │                                          │
│  │ completed│ ├──────────────────────────────────────────┤
│  └──────────┘ │             ConsensusPanel               │
│               │  ┌────────────────────────────────────┐  │
│               │  │ Consensus Status: Agreed           │  │
│               │  │ ✅ Agent1  ✅ Agent2  ❌ Agent3    │  │
│               │  └────────────────────────────────────┘  │
└───────────────┴──────────────────────────────────────────┘
```

**使用的 Hook：** `useSwarm`

### 4.2 TaskList 任务列表

**文件：** `src/components/swarm/TaskList.tsx`

**Props：**
```typescript
interface TaskListProps {
  tasks: SwarmTask[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}
```

**功能：**
- 显示任务列表
- 任务状态指示
- 任务层级展示
- 任务筛选

**任务状态颜色：**
| 状态 | 颜色 |
|------|------|
| pending | 灰色 |
| running | 蓝色 |
| completed | 绿色 |
| failed | 红色 |

### 4.3 ChatTimeline 消息时间线

**文件：** `src/components/swarm/ChatTimeline.tsx`

**Props：**
```typescript
interface ChatTimelineProps {
  messages: SwarmMessage[];
  loading: boolean;
}
```

**功能：**
- 时间线形式展示消息
- 消息类型图标
- 智能体头像
- 消息内容渲染

**消息类型图标：**
| 类型 | 图标 | 说明 |
|------|------|------|
| task_assignment | 📋 | 任务分配 |
| task_status | 📊 | 状态更新 |
| task_progress | ⏳ | 进度更新 |
| task_completion | ✅ | 任务完成 |
| task_failure | ❌ | 任务失败 |
| consensus_request | 🤝 | 共识请求 |
| consensus_response | 🗳️ | 共识响应 |
| disagreement | ⚠️ | 分歧 |
| clarification | 💡 | 澄清 |
| correction | 🔄 | 纠正 |
| info | ℹ️ | 信息 |

### 4.4 ConsensusPanel 共识面板

**文件：** `src/components/swarm/ConsensusPanel.tsx`

**Props：**
```typescript
interface ConsensusPanelProps {
  consensus: ConsensusState | null;
}
```

**功能：**
- 显示共识状态
- 参与者列表
- 同意/反对统计
- 解决方案展示

**结构：**
```
┌──────────────────────────────────────────────────────────┐
│                    Consensus Panel                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Status: 🟡 Pending                                      │
│                                                          │
│  Participants:                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  ✅ Agent1 (agreed)                                  │ │
│  │  ✅ Agent2 (agreed)                                  │ │
│  │  ❌ Agent3 (disagreed)                               │ │
│  │  ⏳ Agent4 (pending)                                 │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  Resolution: Waiting for Agent4's response...            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 5. 工作流组件

### 5.1 WorkflowView 工作流视图

**文件：** `src/components/workflow/WorkflowView.tsx`

**职责：** 工作流管理主视图

**结构：**
```
┌──────────────────────────────────────────────────────────┐
│                     WorkflowView                          │
├───────────────┬──────────────────────────────────────────┤
│               │                                          │
│ WorkflowList  │           WorkflowDetail                 │
│               │                                          │
│  ┌──────────┐ │  ┌────────────────────────────────────┐  │
│  │ Workflow1│ │  │ Name: Code Review Pipeline         │  │
│  │ running  │ │  │ Status: Running (60%)              │  │
│  └──────────┘ │  │                                    │  │
│  ┌──────────┐ │  │ Steps:                             │  │
│  │ Workflow2│ │  │ ✅ Code Check                      │  │
│  │ created  │ │  │ 🔄 Testing (current)               │  │
│  └──────────┘ │  │ ⏳ Review                          │  │
│               │  │ ⏳ Deploy                          │  │
│               │  └────────────────────────────────────┘  │
│               │                                          │
│  [+ Create]   │  [Start] [Pause] [Stop]                  │
└───────────────┴──────────────────────────────────────────┘
```

**使用的 Hook：** `useWorkflow`

### 5.2 WorkflowList 工作流列表

**文件：** `src/components/workflow/WorkflowList.tsx`

**Props：**
```typescript
interface WorkflowListProps {
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  onSelectWorkflow: (id: string) => void;
  onCreateWorkflow: () => void;
}
```

**功能：**
- 显示工作流列表
- 状态筛选
- 创建新工作流按钮

### 5.3 WorkflowDetail 工作流详情

**文件：** `src/components/workflow/WorkflowDetail.tsx`

**Props：**
```typescript
interface WorkflowDetailProps {
  workflow: Workflow | null;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onStop: (id: string) => void;
}
```

**功能：**
- 显示工作流详情
- 步骤进度可视化
- 控制按钮
- 角色分配展示

**步骤可视化：**
```
┌──────────────────────────────────────────────────────────┐
│                    Workflow Steps                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ✅ Code Check ──► 🔄 Testing ──► ⏳ Review ──► ⏳ Deploy │
│     (reviewer)       (tester)       (approver)           │
│                                                          │
│  Progress: ████████████░░░░░░░░ 60%                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 5.4 WorkflowCreator 工作流创建器

**文件：** `src/components/workflow/WorkflowCreator.tsx`

**Props：**
```typescript
interface WorkflowCreatorProps {
  templates: WorkflowTemplate[];
  onCreate: (config: WorkflowConfig) => void;
  onAutoGenerate: (prompt: string) => void;
  onCancel: () => void;
}
```

**功能：**
- 手动创建工作流
- 从模板创建
- AI 自动生成
- 步骤配置
- 角色分配

**结构：**
```
┌──────────────────────────────────────────────────────────┐
│                  Create Workflow                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Name: [________________________]                        │
│                                                          │
│  Description: [________________________________]         │
│                                                          │
│  ┌─ Create Mode ────────────────────────────────────────┐│
│  │ ○ Manual    ○ From Template    ○ AI Generate        ││
│  └───────────────────────────────────────────────────────┘│
│                                                          │
│  Roles:                                                  │
│  [+ Add Role]                                            │
│                                                          │
│  Steps:                                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Step 1: [____________] Assigned to: [___________]  │  │
│  │ Step 2: [____________] Assigned to: [___________]  │  │
│  │ [+ Add Step]                                       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│                          [Cancel]  [Create Workflow]     │
└──────────────────────────────────────────────────────────┘
```

## 6. 设置组件

### 6.1 SettingsView 设置视图

**文件：** `src/components/settings/SettingsView.tsx`

**职责：** 应用配置管理

**结构：**
```
┌──────────────────────────────────────────────────────────┐
│                     Settings                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ Appearance ─────────────────────────────────────────┐│
│  │ Theme:     ○ Light  ○ Dark  ○ System                ││
│  │ Language:  [English ▼]                               ││
│  └───────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─ AI Configuration ───────────────────────────────────┐│
│  │ Provider:  [OpenAI ▼]                                ││
│  │ Model:     [GPT-4 ▼]                                 ││
│  │ API Key:   [••••••••••••] [Show]                     ││
│  └───────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─ Workspace ──────────────────────────────────────────┐│
│  │ Directory: [/Users/xxx/workspace] [Browse]           ││
│  │ Auto Save: [✓]                                       ││
│  │ Max History: [100] messages                          ││
│  └───────────────────────────────────────────────────────┘│
│                                                          │
│  [Reset to Defaults]                    [Save Changes]   │
└──────────────────────────────────────────────────────────┘
```

## 7. 通用 UI 组件

### 7.1 Button 按钮

**文件：** `src/components/ui/button.tsx`

**Props：**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}
```

**变体样式：**
| 变体 | 样式 |
|------|------|
| primary | 蓝色背景，白色文字 |
| secondary | 灰色背景，白色文字 |
| ghost | 透明背景，蓝色边框 |
| danger | 红色背景，白色文字 |

### 7.2 Input 输入框

**文件：** `src/components/ui/input.tsx`

**Props：**
```typescript
interface InputProps {
  type?: 'text' | 'password' | 'email' | 'number';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}
```

### 7.3 Card 卡片

**文件：** `src/components/ui/card.tsx`

**Props：**
```typescript
interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}
```

### 7.4 Badge 徽章

**文件：** `src/components/ui/badge.tsx`

**Props：**
```typescript
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}
```

**变体颜色：**
| 变体 | 颜色 |
|------|------|
| default | 灰色 |
| success | 绿色 |
| warning | 黄色 |
| error | 红色 |
| info | 蓝色 |

## 8. 组件通信模式

### 8.1 父子组件通信

```tsx
// 父组件
function ChatView() {
  const { messages, sendMessage } = useChat();
  
  return (
    <>
      <MessageList messages={messages} />
      <InputBar onSend={sendMessage} />
    </>
  );
}

// 子组件
function InputBar({ onSend }: { onSend: (msg: string) => void }) {
  const [input, setInput] = useState('');
  
  return (
    <input 
      value={input} 
      onChange={(e) => setInput(e.target.value)} 
    />
    <button onClick={() => onSend(input)}>Send</button>
  );
}
```

### 8.2 跨组件状态共享

通过 Zustand Store 共享状态：

```tsx
// Store
const useChatStore = create((set) => ({
  messages: [],
  addMessage: (msg) => set((s) => ({ 
    messages: [...s.messages, msg] 
  })),
}));

// 组件 A
function MessageList() {
  const messages = useChatStore((s) => s.messages);
  return <div>{messages.map(...)}</div>;
}

// 组件 B
function InputBar() {
  const addMessage = useChatStore((s) => s.addMessage);
  return <button onClick={() => addMessage(msg)}>Send</button>;
}
```

### 8.3 事件订阅模式

通过 Hook 封装事件订阅：

```tsx
function useChat() {
  const addMessage = useChatStore((s) => s.addMessage);
  
  useEffect(() => {
    const unsubscribe = window.zeroclaw.chat.onMessage((msg) => {
      addMessage(msg);
    });
    return unsubscribe;
  }, [addMessage]);
  
  return { /* ... */ };
}
```

## 9. 样式规范

### 9.1 TailwindCSS 类名约定

```tsx
// 布局
<div className="flex flex-col gap-4 p-4">

// 文字
<span className="text-sm font-medium text-gray-500">

// 交互
<button className="hover:bg-gray-100 active:bg-gray-200 transition-colors">

// 状态
<div className={cn(
  "px-2 py-1 rounded",
  status === 'running' && "bg-blue-100 text-blue-700",
  status === 'completed' && "bg-green-100 text-green-700",
)}>
```

### 9.2 主题变量

```css
/* globals.css */
:root {
  --color-primary: #3b82f6;
  --color-success: #22c55e;
  --color-warning: #eab308;
  --color-error: #ef4444;
}

.dark {
  --color-primary: #60a5fa;
  /* ... */
}
```

## 10. 组件测试策略

### 10.1 测试文件组织

```
src/__tests__/components/
├── ui/
│   ├── button.test.tsx
│   └── input.test.tsx
├── chat/
│   └── InputBar.test.tsx
├── workflow/
│   └── WorkflowList.test.tsx
└── layout/
    └── Sidebar.test.tsx
```

### 10.2 测试示例

```tsx
describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```
