# ZeroClaw Desktop 架构设计文档

## 1. 项目概述

ZeroClaw Desktop 是一个基于 Electron 的桌面应用程序，用于管理和交互 ZeroClaw AI Agent 系统。该应用提供了对话管理、智能体群聊监控、工作流管理等功能。

### 1.1 技术栈

| 层级 | 技术选型 | 版本 |
|------|----------|------|
| 桌面框架 | Electron | 28.2.2 |
| 前端框架 | React | 18.2.0 |
| 状态管理 | Zustand | 4.5.0 |
| 路由管理 | React Router DOM | 6.22.0 |
| 样式方案 | TailwindCSS | 3.4.1 |
| 数据持久化 | electron-store | 8.1.0 |
| 构建工具 | Vite | 5.1.2 |
| 测试框架 | Vitest | 1.6.1 |
| 类型系统 | TypeScript | 5.3.3 |

### 1.2 项目结构

```
zeroclaw-desktop/
├── electron/                    # Electron 主进程代码
│   ├── main.ts                  # 主进程入口
│   ├── preload.ts               # 预加载脚本（IPC 桥接）
│   ├── core/
│   │   ├── ipc-handlers.ts      # IPC 处理器
│   │   └── zeroclaw-bridge.ts   # ZeroClaw 进程桥接
│   └── store/
│       └── database.ts          # 数据持久化层
├── src/                         # 渲染进程代码
│   ├── components/              # React 组件
│   │   ├── chat/                # 对话相关组件
│   │   ├── swarm/               # 智能体群聊组件
│   │   ├── workflow/            # 工作流组件
│   │   ├── layout/              # 布局组件
│   │   ├── settings/            # 设置组件
│   │   └── ui/                  # 通用 UI 组件
│   ├── hooks/                   # 自定义 React Hooks
│   ├── stores/                  # Zustand 状态管理
│   ├── types/                   # TypeScript 类型定义
│   ├── lib/                     # 工具函数
│   └── styles/                  # 全局样式
├── __tests__/                   # 测试文件
└── dist/                        # 构建输出
```

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        ZeroClaw Desktop                          │
├─────────────────────────────────────────────────────────────────┤
│                          渲染进程 (React)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Chat View  │  │ Swarm View  │  │Workflow View│              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐              │
│  │  useChat    │  │  useSwarm   │  │ useWorkflow │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│  ┌──────▼────────────────▼────────────────▼──────┐              │
│  │              Zustand Stores                    │              │
│  │  (chatStore, swarmStore, workflowStore, etc.)  │              │
│  └───────────────────────┬───────────────────────┘              │
│                          │                                       │
│  ┌───────────────────────▼───────────────────────┐              │
│  │           window.zeroclaw API                  │              │
│  └───────────────────────┬───────────────────────┘              │
└──────────────────────────┼──────────────────────────────────────┘
                           │ IPC (contextBridge)
┌──────────────────────────┼──────────────────────────────────────┐
│                          │                                       │
│                     Preload Script                               │
│                          │                                       │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                        主进程 (Electron)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    IPC Handlers                            │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                  ZeroClaw Bridge                           │  │
│  │              (进程通信 + 消息解析)                           │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                    Database                                │  │
│  │                  (electron-store)                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                           │
                           │ stdin/stdout (JSON)
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    ZeroClaw (Rust 进程)                          │
│                   AI Agent 核心引擎                               │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 进程模型

ZeroClaw Desktop 采用 Electron 的多进程架构：

#### 2.2.1 主进程 (Main Process)

**职责：**
- 创建和管理 BrowserWindow
- 处理系统托盘
- 管理 ZeroClaw 子进程
- 提供 IPC 服务端点
- 数据持久化

**核心模块：**

| 模块 | 文件 | 职责 |
|------|------|------|
| Main | `electron/main.ts` | 应用生命周期管理 |
| IPC Handlers | `electron/core/ipc-handlers.ts` | IPC 请求处理 |
| ZeroClaw Bridge | `electron/core/zeroclaw-bridge.ts` | ZeroClaw 进程通信 |
| Database | `electron/store/database.ts` | 数据存储 |

#### 2.2.2 渲染进程 (Renderer Process)

**职责：**
- 渲染用户界面
- 处理用户交互
- 状态管理
- 调用主进程 API

**安全配置：**
```typescript
{
  nodeIntegration: false,      // 禁用 Node.js 集成
  contextIsolation: true,      // 启用上下文隔离
  preload: path.join(__dirname, 'preload.js'),  // 预加载脚本
}
```

#### 2.2.3 ZeroClaw 子进程

**通信协议：**
- 输入：JSON 格式命令（通过 stdin）
- 输出：JSON 格式消息（通过 stdout）
- 错误：文本日志（通过 stderr）

**消息格式：**
```json
{
  "type": "chat:message|swarm:message|workflow:update|...",
  "data": { /* 消息数据 */ }
}
```

## 3. 核心模块设计

### 3.1 IPC 通信层

#### 3.1.1 通信模式

```
渲染进程                        主进程
    │                            │
    │  ipcRenderer.invoke()      │
    │ ─────────────────────────► │
    │                            │ 处理请求
    │                            │
    │  Promise<result>           │
    │ ◄───────────────────────── │
    │                            │
    │  ipcRenderer.on()          │
    │ ◄───────────────────────── │
    │         (事件推送)          │
```

#### 3.1.2 API 命名规范

| 前缀 | 用途 | 示例 |
|------|------|------|
| `chat:` | 对话相关 | `chat:send`, `chat:history` |
| `swarm:` | 智能体群聊 | `swarm:list`, `swarm:messages` |
| `workflow:` | 工作流 | `workflow:start`, `workflow:stop` |
| `system:` | 系统控制 | `system:start`, `system:status` |

### 3.2 ZeroClaw Bridge

#### 3.2.1 进程管理

```typescript
class ZeroClawBridge extends EventEmitter {
  private process: ChildProcess | null;
  private isRunning: boolean;
  
  // 启动 ZeroClaw 进程
  start(): Promise<{ status: string }>;
  
  // 停止进程
  stop(): void;
  
  // 发送命令
  sendMessage(message: string, sessionId?: string): Promise<{ success: boolean }>;
}
```

#### 3.2.2 消息解析流程

```
ZeroClaw stdout
      │
      ▼
┌─────────────┐
│ 消息缓冲区   │  ← 处理不完整的 JSON 行
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ JSON 解析   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│ 类型路由    │ ──► │ chat:message │
└─────────────┘     │ swarm:message │
                    │ workflow:update│
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ 广播到渲染进程  │
                    └───────────────┘
```

### 3.3 数据持久化

#### 3.3.1 存储结构

```typescript
interface StoreData {
  sessions: Record<string, Session>;      // 会话
  messages: Record<string, Message[]>;    // 消息（按会话ID索引）
  swarmTasks: Record<string, SwarmTask>;  // 智能体任务
  swarmMessages: SwarmMessage[];          // 智能体消息
  workflows: Record<string, Workflow>;    // 工作流
  workflowTemplates: Record<string, Template>; // 工作流模板
  config: AppConfig;                      // 应用配置
}
```

#### 3.3.2 数据流向

```
渲染进程操作
      │
      ▼
IPC 调用
      │
      ▼
Database 方法
      │
      ▼
electron-store
      │
      ▼
本地文件系统
(~/.config/zeroclaw-desktop/config.json)
```

## 4. 前端架构

### 4.1 状态管理

采用 Zustand 进行状态管理，每个功能域有独立的 Store：

```
┌─────────────────────────────────────────────────────────────┐
│                        Zustand Stores                        │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│ chatStore   │ swarmStore  │workflowStore│ settingsStore    │
├─────────────┼─────────────┼─────────────┼──────────────────┤
│ messages    │ tasks       │ workflows   │ theme            │
│ sessions    │ messages    │ templates   │ language         │
│ currentId   │ consensus   │ selectedId  │ provider         │
│ loading     │ selectedId  │ loading     │ model            │
│ streaming   │ loading     │             │ apiKey           │
│ error       │             │             │ workspaceDir     │
└─────────────┴─────────────┴─────────────┴──────────────────┘
```

### 4.2 组件层次结构

```
App
├── Sidebar                    # 侧边栏导航
│   └── NavItem[]             # 导航项
├── Main Content
│   ├── ChatView              # 对话视图
│   │   ├── SessionList       # 会话列表
│   │   ├── MessageList       # 消息列表
│   │   │   └── MessageItem[] # 消息项
│   │   └── InputBar          # 输入栏
│   ├── SwarmView             # 智能体视图
│   │   ├── TaskList          # 任务列表
│   │   ├── ChatTimeline      # 消息时间线
│   │   └── ConsensusPanel    # 共识面板
│   ├── WorkflowView          # 工作流视图
│   │   ├── WorkflowList      # 工作流列表
│   │   ├── WorkflowDetail    # 工作流详情
│   │   └── WorkflowCreator   # 工作流创建器
│   └── SettingsView          # 设置视图
└── StatusBar                  # 状态栏
```

### 4.3 自定义 Hooks

每个功能域有对应的 Hook，封装业务逻辑：

| Hook | 文件 | 职责 |
|------|------|------|
| useChat | `hooks/useChat.ts` | 对话管理、消息发送、会话操作 |
| useSwarm | `hooks/useSwarm.ts` | 智能体任务管理、消息订阅 |
| useWorkflow | `hooks/useWorkflow.ts` | 工作流 CRUD、生命周期控制 |

**Hook 职责：**
1. 订阅 IPC 事件
2. 调用 IPC 方法
3. 更新 Store 状态
4. 提供业务方法给组件

## 5. 安全设计

### 5.1 进程隔离

```
┌──────────────────────────────────────────────────────────────┐
│                       渲染进程                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    JavaScript 上下文                    │  │
│  │                   (无法访问 Node.js)                    │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ▲                                   │
│                          │ contextBridge                     │
│                          │ (安全暴露 API)                     │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │              window.zeroclaw API                       │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 API 暴露原则

1. **最小权限原则**：只暴露必要的 API
2. **类型安全**：使用 TypeScript 定义 API 类型
3. **参数验证**：在主进程验证所有输入参数

### 5.3 敏感数据处理

- API Key 存储在 electron-store（加密存储可选）
- 不在渲染进程存储敏感信息
- 日志中不输出敏感信息

## 6. 性能优化

### 6.1 渲染优化

- 使用 React.memo 优化组件重渲染
- 虚拟列表处理大量消息
- 懒加载非关键组件

### 6.2 数据优化

- 消息分页加载
- 智能体消息限制最近 1000 条
- 使用索引加速查询

### 6.3 进程通信优化

- 批量消息推送
- 避免频繁 IPC 调用
- 使用事件订阅替代轮询

## 7. 错误处理

### 7.1 错误边界

```typescript
// 组件级错误边界
<ErrorBoundary fallback={<ErrorFallback />}>
  <ChatView />
</ErrorBoundary>
```

### 7.2 错误传播

```
ZeroClaw 进程错误
       │
       ▼
stderr 日志
       │
       ▼
主进程处理
       │
       ▼
广播到渲染进程
       │
       ▼
UI 显示错误信息
```

### 7.3 恢复机制

- 进程崩溃自动重启
- 网络断开重连
- 数据自动保存

## 8. 测试策略

### 8.1 测试金字塔

```
          ▲
         /│\
        / │ \        E2E 测试
       /  │  \
      /───┼───\      
     /    │    \     集成测试 (37)
    /     │     \
   /──────┼──────\   
  /       │       \  单元测试 (181)
 /        │        \
/─────────┼─────────\
```

### 8.2 测试覆盖

| 类型 | 数量 | 覆盖范围 |
|------|------|----------|
| Store 测试 | 57 | 状态管理逻辑 |
| Hook 测试 | 50 | 业务逻辑 |
| 组件测试 | 67 | UI 交互 |
| 集成测试 | 37 | IPC 通信 |
| 工具测试 | 7 | 辅助函数 |

## 9. 部署架构

### 9.1 构建流程

```
源代码
   │
   ├── Vite Build ──► dist/ (渲染进程)
   │
   └── tsc Build ──► dist/electron/ (主进程)
                      │
                      ▼
               electron-builder
                      │
                      ▼
              ┌───────┴───────┐
              │               │
           .dmg            .exe
          (macOS)        (Windows)
```

### 9.2 应用打包

```json
{
  "appId": "com.zeroclaw.desktop",
  "productName": "ZeroClaw Desktop",
  "mac": {
    "category": "public.app-category.developer-tools"
  },
  "win": {},
  "linux": {}
}
```

## 10. 扩展性设计

### 10.1 插件系统（规划）

- 支持第三方主题
- 支持自定义消息渲染器
- 支持扩展工作流步骤

### 10.2 API 扩展

- 新增 IPC 通道只需修改 preload.ts 和 ipc-handlers.ts
- 新增消息类型只需在 zeroclaw-bridge.ts 添加处理器

### 10.3 UI 扩展

- 组件化设计支持复用
- 主题系统支持自定义
- 布局系统支持调整
