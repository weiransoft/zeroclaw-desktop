# ZeroClaw Desktop 数据流设计文档

## 1. 数据流概述

ZeroClaw Desktop 的数据流遵循单向数据流原则，从主进程到渲染进程，从 Store 到组件。数据流涉及三个主要层次：

1. **进程间数据流**：ZeroClaw 进程 ↔ 主进程 ↔ 渲染进程
2. **应用状态流**：IPC API → Hook → Store → 组件
3. **用户交互流**：组件 → Hook → IPC → 主进程

## 2. 整体数据流架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据流总览                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐                                                           │
│   │  ZeroClaw   │                                                           │
│   │  (Rust 进程) │                                                          │
│   └──────┬──────┘                                                           │
│          │ stdout (JSON)                                                    │
│          ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         主进程                                       │   │
│   │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │   │
│   │  │ ZeroClaw     │───►│ IPC          │───►│ Database     │         │   │
│   │  │ Bridge       │    │ Handlers     │    │ (Store)      │         │   │
│   │  └──────────────┘    └──────────────┘    └──────────────┘         │   │
│   │         │                   │                                      │   │
│   │         │                   │ IPC (invoke/on)                      │   │
│   │         │                   ▼                                      │   │
│   └─────────┼───────────────────────────────────────────────────────────┘   │
│             │                                                               │
│   ┌─────────▼───────────────────────────────────────────────────────────┐   │
│   │                        渲染进程                                      │   │
│   │                                                                     │   │
│   │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │   │
│   │  │ window.      │───►│ Custom Hooks │───►│ Zustand      │         │   │
│   │  │ zeroclaw API │    │ (useChat等)  │    │ Stores       │         │   │
│   │  └──────────────┘    └──────────────┘    └──────────────┘         │   │
│   │                                               │                    │   │
│   │                                               │ 订阅状态            │   │
│   │                                               ▼                    │   │
│   │                                        ┌──────────────┐           │   │
│   │                                        │ React        │           │   │
│   │                                        │ Components   │           │   │
│   │                                        └──────────────┘           │   │
│   │                                               │                    │   │
│   │                                               │ 用户交互            │   │
│   │                                               ▼                    │   │
│   │                                        ┌──────────────┐           │   │
│   │                                        │ Event        │           │   │
│   │                                        │ Handlers     │           │   │
│   │                                        └──────────────┘           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3. 进程间数据流

### 3.1 ZeroClaw 到主进程

ZeroClaw 进程通过 stdout 输出 JSON 格式的消息：

```
ZeroClaw stdout
      │
      │ {"type": "chat:message", "data": {...}}
      │ {"type": "swarm:message", "data": {...}}
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│                    ZeroClawBridge                            │
│                                                             │
│  handleOutput(data)                                         │
│      │                                                      │
│      ▼                                                      │
│  messageBuffer += data                                      │
│      │                                                      │
│      ▼                                                      │
│  lines = split('\n')                                        │
│      │                                                      │
│      ▼                                                      │
│  parseMessage(line)                                         │
│      │                                                      │
│      ├──► handleChatMessage() ──► broadcastToWindows()      │
│      ├──► handleSwarmMessage() ──► broadcastToWindows()     │
│      ├──► handleConsensus() ────► broadcastToWindows()      │
│      └──► handleWorkflowUpdate() ► broadcastToWindows()     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**消息类型路由：**

| 消息类型 | 处理方法 | 广播事件 |
|----------|----------|----------|
| `chat:message` | handleChatMessage | `chat:message` |
| `chat:toolcall` | handleToolCall | `chat:toolcall` |
| `chat:status` | handleStatus | `chat:status` |
| `swarm:message` | handleSwarmMessage | `swarm:message` |
| `swarm:consensus` | handleConsensus | `swarm:consensus` |
| `swarm:task` | handleSwarmTask | `swarm:task` |
| `workflow:update` | handleWorkflowUpdate | `workflow:update` |

### 3.2 主进程到渲染进程

主进程通过 IPC 事件推送数据到渲染进程：

```
主进程
    │
    │ broadcastToWindows('chat:message', data)
    │
    ▼
BrowserWindow.getAllWindows()
    │
    │ win.webContents.send('chat:message', data)
    │
    ▼
渲染进程 (Preload Script)
    │
    │ ipcRenderer.on('chat:message', handler)
    │
    ▼
回调函数执行
```

### 3.3 渲染进程到主进程

渲染进程通过 IPC invoke 调用主进程方法：

```
渲染进程
    │
    │ window.zeroclaw.chat.send(message)
    │
    ▼
Preload Script
    │
    │ ipcRenderer.invoke('chat:send', message)
    │
    ▼
主进程 (IPC Handler)
    │
    │ ipcMain.handle('chat:send', handler)
    │
    ▼
ZeroClawBridge.sendMessage()
    │
    │ stdin.write(JSON.stringify({type: 'input', data: message}))
    │
    ▼
ZeroClaw 进程
```

## 4. 应用状态流

### 4.1 状态管理架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Zustand Store 架构                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│   │   chatStore     │   │   swarmStore    │   │ workflowStore   │          │
│   ├─────────────────┤   ├─────────────────┤   ├─────────────────┤          │
│   │ messages        │   │ tasks           │   │ workflows       │          │
│   │ sessions        │   │ messages        │   │ templates       │          │
│   │ currentSessionId│   │ consensus       │   │ selectedId      │          │
│   │ loading         │   │ selectedTaskId  │   │ loading         │          │
│   │ streaming       │   │ loading         │   │                 │          │
│   │ error           │   │                 │   │                 │          │
│   ├─────────────────┤   ├─────────────────┤   ├─────────────────┤          │
│   │ setMessages()   │   │ setTasks()      │   │ setWorkflows()  │          │
│   │ addMessage()    │   │ addTask()       │   │ addWorkflow()   │          │
│   │ setSessions()   │   │ updateTask()    │   │ updateWorkflow()│          │
│   │ setCurrentSession()│ │ setMessages()   │   │ setTemplates()  │          │
│   │ setLoading()    │   │ addMessage()    │   │ setSelected()   │          │
│   │ setStreaming()  │   │ setConsensus()  │   │ setLoading()    │          │
│   │ setError()      │   │ setSelected()   │   │                 │          │
│   │ reset()         │   │ setLoading()    │   │                 │          │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘          │
│                                                                             │
│   ┌─────────────────┐                                                      │
│   │ settingsStore   │                                                      │
│   ├─────────────────┤                                                      │
│   │ theme           │                                                      │
│   │ language        │                                                      │
│   │ provider        │                                                      │
│   │ model           │                                                      │
│   │ apiKey          │                                                      │
│   │ workspaceDir    │                                                      │
│   ├─────────────────┤                                                      │
│   │ setTheme()      │                                                      │
│   │ setLanguage()   │                                                      │
│   │ setProvider()   │                                                      │
│   │ setModel()      │                                                      │
│   │ setApiKey()     │                                                      │
│   │ setWorkspace()  │                                                      │
│   └─────────────────┘                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 状态更新流程

#### 4.2.1 事件驱动的状态更新

```
IPC 事件
    │
    │ chat:message
    │
    ▼
Hook (useChat)
    │
    │ useEffect 订阅
    │
    ▼
Store Action
    │
    │ addMessage(msg)
    │
    ▼
Store 状态更新
    │
    │ messages: [...state.messages, msg]
    │
    ▼
组件重渲染
```

**代码示例：**

```typescript
// useChat.ts
export function useChat() {
  const addMessage = useChatStore((s) => s.addMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);

  // 订阅消息事件
  useEffect(() => {
    const unsubscribe = window.zeroclaw.chat.onMessage((msg) => {
      addMessage(msg as Message);
      setStreaming(false);
    });
    return unsubscribe;
  }, [addMessage, setStreaming]);

  // ...
}
```

#### 4.2.2 用户操作触发的状态更新

```
用户点击发送
    │
    │ onClick
    │
    ▼
Hook 方法
    │
    │ sendMessage(content)
    │
    ├──► setLoading(true)
    ├──► setStreaming(true)
    ├──► addMessage(userMessage)
    │
    ▼
IPC 调用
    │
    │ window.zeroclaw.chat.send(content)
    │
    ▼
主进程处理
    │
    │ 返回结果或触发事件
    │
    ▼
事件回调更新状态
```

**代码示例：**

```typescript
// useChat.ts
const sendMessage = useCallback(async (content: string) => {
  if (!content.trim()) return;

  // 立即更新 UI
  const userMessage: Message = {
    id: uuidv4(),
    sessionId: currentSessionId!,
    role: 'user',
    content: content.trim(),
    timestamp: Date.now(),
  };
  
  addMessage(userMessage);
  setInputValue('');
  setLoading(true);
  setStreaming(true);

  try {
    // 发送到主进程
    await window.zeroclaw.chat.send(content.trim(), sessionId);
  } catch (err) {
    setError('Failed to send message');
    setStreaming(false);
  } finally {
    setLoading(false);
  }
}, [currentSessionId, addMessage, setLoading, setStreaming, setError]);
```

## 5. 具体数据流场景

### 5.1 发送消息流程

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           发送消息完整流程                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  用户输入 "Hello"                                                            │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ InputBar 组件                                                        │    │
│  │                                                                      │    │
│  │  const handleSend = () => {                                          │    │
│  │    sendMessage(inputValue);                                          │    │
│  │  };                                                                  │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ useChat Hook                                                         │    │
│  │                                                                      │    │
│  │  1. 创建用户消息对象                                                  │    │
│  │     const userMessage = { id, role: 'user', content: 'Hello', ... }  │    │
│  │                                                                      │    │
│  │  2. 更新本地状态                                                      │    │
│  │     addMessage(userMessage)  ──► chatStore.messages 更新             │    │
│  │     setLoading(true)         ──► chatStore.loading = true            │    │
│  │     setStreaming(true)       ──► chatStore.streaming = true          │    │
│  │                                                                      │    │
│  │  3. 调用 IPC                                                         │    │
│  │     await window.zeroclaw.chat.send('Hello', sessionId)              │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  │ IPC invoke                                │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 主进程 - IPC Handler                                                  │    │
│  │                                                                      │    │
│  │  ipcMain.handle('chat:send', async (_, message, sessionId) => {      │    │
│  │    return bridge.sendMessage(message, sessionId);                    │    │
│  │  });                                                                 │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ZeroClawBridge                                                       │    │
│  │                                                                      │    │
│  │  1. 保存用户消息到数据库                                              │    │
│  │     db.addMessage(sessionId, userMessage)                            │    │
│  │                                                                      │    │
│  │  2. 广播用户消息到渲染进程                                            │    │
│  │     broadcastToWindows('chat:message', userMessage)                  │    │
│  │                                                                      │    │
│  │  3. 发送命令到 ZeroClaw 进程                                          │    │
│  │     process.stdin.write(JSON.stringify({                             │    │
│  │       type: 'input',                                                 │    │
│  │       data: 'Hello'                                                  │    │
│  │     }) + '\n')                                                       │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  │ stdin                                     │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ZeroClaw 进程 (Rust)                                                  │    │
│  │                                                                      │    │
│  │  处理输入，生成 AI 响应...                                            │    │
│  │                                                                      │    │
│  │  stdout: {"type": "chat:message", "data": {...}}                     │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  │ stdout (JSON)                             │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ZeroClawBridge - handleOutput                                        │    │
│  │                                                                      │    │
│  │  1. 解析 JSON 消息                                                    │    │
│  │  2. 路由到对应处理器                                                  │    │
│  │     handleChatMessage(data)                                          │    │
│  │                                                                      │    │
│  │  3. 保存 AI 消息到数据库                                              │    │
│  │     db.addMessage(sessionId, aiMessage)                              │    │
│  │                                                                      │    │
│  │  4. 广播 AI 消息到渲染进程                                            │    │
│  │     broadcastToWindows('chat:message', aiMessage)                    │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  │ IPC event                                 │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 渲染进程 - Preload Script                                             │    │
│  │                                                                      │    │
│  │  ipcRenderer.on('chat:message', handler)                             │    │
│  │     │                                                                │    │
│  │     └──► callback(aiMessage)                                         │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ useChat Hook - 事件回调                                               │    │
│  │                                                                      │    │
│  │  onMessage 回调执行:                                                  │    │
│  │     addMessage(aiMessage)  ──► chatStore.messages 更新               │    │
│  │     setStreaming(false)    ──► chatStore.streaming = false           │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  │ Zustand 订阅                              │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ MessageList 组件                                                      │    │
│  │                                                                      │    │
│  │  const messages = useChatStore((s) => s.messages);                   │    │
│  │                                                                      │    │
│  │  // 自动重渲染，显示新消息                                             │    │
│  │  return messages.map(msg => <MessageItem key={msg.id} {...msg} />)   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 工作流执行流程

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          工作流执行数据流                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  用户点击 "启动工作流"                                                        │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ WorkflowDetail 组件                                                   │    │
│  │                                                                      │    │
│  │  const handleStart = () => startWorkflow(workflow.id);              │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ useWorkflow Hook                                                     │    │
│  │                                                                      │    │
│  │  const startWorkflow = async (id: string) => {                       │    │
│  │    await window.zeroclaw.workflow.start(id);                         │    │
│  │  };                                                                  │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  │ IPC invoke                                │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 主进程 - ZeroClawBridge                                               │    │
│  │                                                                      │    │
│  │  async startWorkflow(id: string) {                                   │    │
│  │    const command = JSON.stringify({                                  │    │
│  │      type: 'workflow:start',                                         │    │
│  │      data: { id }                                                    │    │
│  │    }) + '\n';                                                        │    │
│  │    this.process.stdin.write(command);                                │    │
│  │  }                                                                   │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  │ stdin                                     │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ZeroClaw 进程                                                         │    │
│  │                                                                      │    │
│  │  执行工作流...                                                        │    │
│  │                                                                      │    │
│  │  步骤状态变化时输出:                                                   │    │
│  │  {"type": "workflow:update", "data": {                               │    │
│  │    "id": "w1",                                                       │    │
│  │    "status": "running",                                              │    │
│  │    "steps": [                                                        │    │
│  │      {"name": "Step1", "status": "completed"},                       │    │
│  │      {"name": "Step2", "status": "running"}                          │    │
│  │    ]                                                                 │    │
│  │  }}                                                                  │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  │ stdout                                    │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ZeroClawBridge - handleWorkflowUpdate                                │    │
│  │                                                                      │    │
│  │  1. 更新数据库                                                        │    │
│  │     db.updateWorkflow(workflow)                                      │    │
│  │                                                                      │    │
│  │  2. 广播更新                                                          │    │
│  │     broadcastToWindows('workflow:update', workflow)                  │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  │ IPC event                                 │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ useWorkflow Hook - 事件回调                                           │    │
│  │                                                                      │    │
│  │  onUpdate 回调执行:                                                   │    │
│  │     updateWorkflow(workflow)  ──► workflowStore.workflows 更新       │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ WorkflowDetail 组件                                                   │    │
│  │                                                                      │    │
│  │  // 自动重渲染，显示最新状态                                           │    │
│  │  const workflow = useWorkflowStore((s) =>                            │    │
│  │    s.workflows.find(w => w.id === selectedId)                        │    │
│  │  );                                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 智能体群聊消息流

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        智能体群聊消息数据流                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ZeroClaw 智能体协作                                                         │
│       │                                                                      │
│       │ stdout                                                               │
│       ▼                                                                      │
│  {"type": "swarm:message", "data": {                                         │
│    "runId": "run-123",                                                       │
│    "taskId": "task-456",                                                     │
│    "author": "Agent1",                                                       │
│    "authorType": "agent",                                                    │
│    "messageType": "task_assignment",                                         │
│    "content": "I'll handle the code review",                                 │
│    "timestamp": 1234567890                                                   │
│  }}                                                                          │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ZeroClawBridge                                                       │    │
│  │                                                                      │    │
│  │  handleSwarmMessage(data) {                                          │    │
│  │    // 1. 保存到数据库                                                 │    │
│  │    this.db.addSwarmMessage(data);                                    │    │
│  │                                                                      │    │
│  │    // 2. 广播到渲染进程                                               │    │
│  │    broadcastToWindows('swarm:message', data);                        │    │
│  │  }                                                                   │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  │ IPC event                                 │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ useSwarm Hook                                                        │    │
│  │                                                                      │    │
│  │  useEffect(() => {                                                   │    │
│  │    const unsubscribe = window.zeroclaw.swarm.onMessage((msg) => {    │    │
│  │      addMessage(msg);  // 更新 swarmStore.messages                   │    │
│  │    });                                                               │    │
│  │    return unsubscribe;                                               │    │
│  │  }, [addMessage]);                                                   │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ChatTimeline 组件                                                     │    │
│  │                                                                      │    │
│  │  const messages = useSwarmStore((s) => s.messages);                  │    │
│  │                                                                      │    │
│  │  return (                                                            │    │
│  │    <div className="timeline">                                        │    │
│  │      {messages.map(msg => (                                          │    │
│  │        <div key={msg.id} className="message">                        │    │
│  │          <Avatar name={msg.author} />                                │    │
│  │          <Content>{msg.content}</Content>                            │    │
│  │          <Time>{formatTime(msg.timestamp)}</Time>                    │    │
│  │        </div>                                                        │    │
│  │      ))}                                                             │    │
│  │    </div>                                                            │    │
│  │  );                                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 6. 数据持久化流

### 6.1 存储架构

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            数据持久化架构                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   渲染进程                                                                   │
│       │                                                                      │
│       │ IPC invoke                                                           │
│       ▼                                                                      │
│   主进程                                                                     │
│       │                                                                      │
│       ▼                                                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Database (electron-store)                                            │   │
│   │                                                                      │   │
│   │  存储结构:                                                            │   │
│   │  {                                                                   │   │
│   │    sessions: {                                                       │   │
│   │      "session-1": { id, name, createdAt, updatedAt },               │   │
│   │      "session-2": { ... }                                            │   │
│   │    },                                                                │   │
│   │    messages: {                                                       │   │
│   │      "session-1": [ { id, role, content, timestamp }, ... ],        │   │
│   │      "session-2": [ ... ]                                            │   │
│   │    },                                                                │   │
│   │    swarmTasks: {                                                     │   │
│   │      "task-1": { id, runId, agentName, task, status, ... },         │   │
│   │    },                                                                │   │
│   │    swarmMessages: [ { id, runId, taskId, author, content, ... } ],  │   │
│   │    workflows: {                                                      │   │
│   │      "workflow-1": { id, name, status, steps, ... },                │   │
│   │    },                                                                │   │
│   │    workflowTemplates: { ... },                                       │   │
│   │    config: { theme, language, provider, model, ... }                │   │
│   │  }                                                                   │   │
│   └───────────────────────────────┬─────────────────────────────────────┘   │
│                                   │                                          │
│                                   │ 自动保存                                  │
│                                   ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ 文件系统                                                              │   │
│   │                                                                      │   │
│   │  macOS: ~/Library/Application Support/zeroclaw-desktop/config.json  │   │
│   │  Windows: %APPDATA%/zeroclaw-desktop/config.json                     │   │
│   │  Linux: ~/.config/zeroclaw-desktop/config.json                       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 数据同步策略

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            数据同步策略                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  写入流程:                                                                   │
│                                                                              │
│  IPC 调用 ──► Database 方法 ──► electron-store.set() ──► 文件系统            │
│                                                                              │
│  读取流程:                                                                   │
│                                                                              │
│  IPC 调用 ──► Database 方法 ──► electron-store.get() ──► 返回数据            │
│                                                                              │
│  缓存策略:                                                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  内存缓存 (Store 对象)                                                │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │  sessions: {...}     ←── 首次访问时加载                       │    │    │
│  │  │  messages: {...}     ←── 按需加载                             │    │    │
│  │  │  workflows: {...}    ←── 首次访问时加载                       │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  自动保存: electron-store 在每次 set() 后自动持久化到文件                      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 7. 错误处理流

### 7.1 错误传播链

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            错误传播链                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ZeroClaw 进程错误                                                           │
│       │                                                                      │
│       │ stderr 或 JSON 错误消息                                              │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ZeroClawBridge                                                       │    │
│  │                                                                      │    │
│  │  process.stderr.on('data', (data) => {                               │    │
│  │    handleLog('error', data.toString());                              │    │
│  │    broadcastToWindows('system:log', {                                │    │
│  │      level: 'error',                                                 │    │
│  │      message: data.toString()                                        │    │
│  │    });                                                               │    │
│  │  });                                                                 │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  │ IPC event                                 │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 渲染进程                                                              │    │
│  │                                                                      │    │
│  │  system.onLog((log) => {                                             │    │
│  │    if (log.level === 'error') {                                      │    │
│  │      showErrorToast(log.message);                                    │    │
│  │    }                                                                 │    │
│  │  });                                                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  IPC 调用错误                                                                │
│       │                                                                      │
│       │ Promise reject                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Hook 层                                                               │    │
│  │                                                                      │    │
│  │  try {                                                               │    │
│  │    await window.zeroclaw.chat.send(message);                         │    │
│  │  } catch (error) {                                                   │    │
│  │    setError('Failed to send message');                               │    │
│  │    console.error('Send failed:', error);                             │    │
│  │  }                                                                   │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                  │                                           │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 组件层                                                                │    │
│  │                                                                      │    │
│  │  const error = useChatStore((s) => s.error);                         │    │
│  │                                                                      │    │
│  │  {error && <ErrorBanner message={error} onClose={clearError} />}     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 8. 性能优化策略

### 8.1 数据流优化

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          数据流性能优化                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. 批量处理                                                                 │
│     ┌───────────────────────────────────────────────────────────────────┐   │
│     │ 多条消息合并为一个 IPC 事件，减少通信开销                            │   │
│     │                                                                    │   │
│     │ // 主进程                                                          │   │
│     │ let messageBuffer = [];                                            │   │
│     │ let flushTimer: NodeJS.Timeout;                                    │   │
│     │                                                                    │   │
│     │ function queueMessage(msg) {                                       │   │
│     │   messageBuffer.push(msg);                                         │   │
│     │   if (!flushTimer) {                                               │   │
│     │     flushTimer = setTimeout(flushMessages, 100);                   │   │
│     │   }                                                                │   │
│     │ }                                                                  │   │
│     │                                                                    │   │
│     │ function flushMessages() {                                         │   │
│     │   broadcastToWindows('chat:messages-batch', messageBuffer);       │   │
│     │   messageBuffer = [];                                              │   │
│     │   flushTimer = null;                                               │   │
│     │ }                                                                  │   │
│     └───────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  2. 增量更新                                                                 │
│     ┌───────────────────────────────────────────────────────────────────┐   │
│     │ 只传输变化的数据，而非完整对象                                      │   │
│     │                                                                    │   │
│     │ // 工作流更新只发送变化的步骤                                       │   │
│     │ {                                                                  │   │
│     │   type: 'workflow:step-update',                                    │   │
│     │   data: {                                                          │   │
│     │     workflowId: 'w1',                                              │   │
│     │     stepName: 'Step2',                                             │   │
│     │     status: 'completed'                                            │   │
│     │   }                                                                │   │
│     │ }                                                                  │   │
│     └───────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  3. 选择性订阅                                                               │
│     ┌───────────────────────────────────────────────────────────────────┐   │
│     │ 组件只订阅需要的状态片段                                            │   │
│     │                                                                    │   │
│     │ // ❌ 不好：订阅整个 store                                          │   │
│     │ const store = useChatStore();                                      │   │
│     │                                                                    │   │
│     │ // ✅ 好：只订阅需要的字段                                          │   │
│     │ const messages = useChatStore((s) => s.messages);                  │   │
│     │ const loading = useChatStore((s) => s.loading);                    │   │
│     └───────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  4. 虚拟列表                                                                 │
│     ┌───────────────────────────────────────────────────────────────────┐   │
│     │ 大量消息使用虚拟列表渲染                                            │   │
│     │                                                                    │   │
│     │ <VirtualList                                                       │   │
│     │   items={messages}                                                 │   │
│     │   itemHeight={80}                                                  │   │
│     │   renderItem={(msg) => <MessageItem message={msg} />}              │   │
│     │ />                                                                 │   │
│     └───────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 9. 数据流安全

### 9.1 数据验证

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            数据验证流程                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  IPC 输入验证:                                                               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 主进程 IPC Handler                                                    │    │
│  │                                                                      │    │
│  │  ipcMain.handle('chat:send', async (_, message, sessionId) => {      │    │
│  │    // 验证参数类型                                                    │    │
│  │    if (typeof message !== 'string') {                                │    │
│  │      throw new Error('Invalid message type');                        │    │
│  │    }                                                                 │    │
│  │                                                                      │    │
│  │    // 验证参数长度                                                    │    │
│  │    if (message.length > 10000) {                                     │    │
│  │      throw new Error('Message too long');                            │    │
│  │    }                                                                 │    │
│  │                                                                      │    │
│  │    // 验证 sessionId 格式                                             │    │
│  │    if (sessionId && !isValidUUID(sessionId)) {                       │    │
│  │      throw new Error('Invalid session ID');                          │    │
│  │    }                                                                 │    │
│  │                                                                      │    │
│  │    return bridge.sendMessage(message, sessionId);                    │    │
│  │  });                                                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ZeroClaw 输出验证:                                                          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ZeroClawBridge                                                        │    │
│  │                                                                      │    │
│  │  parseMessage(line: string) {                                        │    │
│  │    try {                                                             │    │
│  │      const msg = JSON.parse(line);                                   │    │
│  │                                                                      │    │
│  │      // 验证消息结构                                                  │    │
│  │      if (!msg.type || !msg.data) {                                   │    │
│  │        console.warn('Invalid message structure');                    │    │
│  │        return;                                                       │    │
│  │      }                                                               │    │
│  │                                                                      │    │
│  │      // 验证消息类型                                                  │    │
│  │      if (!VALID_MESSAGE_TYPES.includes(msg.type)) {                  │    │
│  │        console.warn('Unknown message type:', msg.type);              │    │
│  │        return;                                                       │    │
│  │      }                                                               │    │
│  │                                                                      │    │
│  │      this.routeMessage(msg.type, msg.data);                          │    │
│  │    } catch (e) {                                                     │    │
│  │      // 非 JSON，当作日志处理                                         │    │
│  │      this.handleLog('info', line);                                   │    │
│  │    }                                                                 │    │
│  │  }                                                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 10. 总结

### 10.1 数据流设计原则

1. **单向数据流**：数据从主进程流向渲染进程，状态从 Store 流向组件
2. **事件驱动**：通过 IPC 事件实现进程间通信，通过订阅模式实现状态同步
3. **关注点分离**：Hook 封装业务逻辑，Store 管理状态，组件负责渲染
4. **错误边界**：每层都有错误处理机制，确保错误不会跨层传播

### 10.2 关键数据流路径

| 场景 | 数据流路径 |
|------|------------|
| 发送消息 | 组件 → Hook → IPC → Bridge → ZeroClaw → Bridge → IPC → Hook → Store → 组件 |
| 接收消息 | ZeroClaw → Bridge → IPC → Hook → Store → 组件 |
| 工作流控制 | 组件 → Hook → IPC → Bridge → ZeroClaw |
| 状态更新 | ZeroClaw → Bridge → IPC → Hook → Store → 组件 |
| 持久化 | IPC → Database → electron-store → 文件系统 |
