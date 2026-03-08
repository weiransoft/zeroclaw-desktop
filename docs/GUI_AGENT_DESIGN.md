# ZeroClaw GUI Agent 设计文档

## 文档信息

| 属性 | 值 |
|------|-----|
| **产品名称** | ZeroClaw GUI Agent |
| **版本** | v1.0.0 |
| **文档版本** | v1.0 |
| **最后更新** | 2026-03-08 |
| **作者** | Architect Agent |
| **功能类别** | Desktop Automation + GUI Monitoring |

---

## 1. 概述

### 1.1 项目背景

ZeroClaw 生态系统已经具备了强大的 AI Agent 能力（zeroclaw - Rust 后端）和桌面交互界面（zeroclaw-desktop - Electron 前端）。GUI Agent 的目标是让 ZeroClaw 具备**监控和自动化操作桌面应用**的能力，实现真正的"智能桌面助手"。

### 1.2 核心价值

- **屏幕感知**: 能够捕获屏幕内容，识别应用界面元素
- **自动化控制**: 模拟鼠标键盘操作，自动化重复性任务
- **应用监控**: 实时监控指定应用的状态和行为
- **AI 驱动**: 结合 LLM 能力，理解界面语义，做出智能决策

### 1.3 技术定位

GUI Agent 不是替代 zeroclaw-desktop，而是**增强 zeroclaw 的能力**：

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ZeroClaw Ecosystem                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  zeroclaw (Rust) ───────────────────────► GUI Agent (新增能力)       │
│     │                                                    │            │
│     │  AI Agent Core                                     │  Screen    │
│     │  - Chat, Swarm, Workflow                         │  Capture   │
│     │  - Tool Execution                                │  +         │
│     │                                                    │  Automation│
│     ▼                                                    ▼            │
│  zeroclaw-desktop (Electron)                                        │
│     │                                                                 │
│     │  UI Interface                                                   │
│     │  - Chat, Swarm, Workflow Views                                │
│     ▼                                                                 │
│  User Interaction                                                    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 需求分析

### 2.1 功能需求

#### 2.1.1 屏幕监控

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 屏幕截图 | 捕获整个屏幕或指定区域 | High |
| 窗口定位 | 识别指定应用窗口的位置和状态 | High |
| 窗口监控 | 实时监控窗口的激活/关闭/大小变化 | Medium |
| 图像识别 | 识别屏幕上的图像元素（按钮、图标等） | High |

#### 2.1.2 应用控制

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 启动应用 | 通过路径或包名启动指定应用 | High |
| 窗口操作 | 最大化/最小化/关闭/移动窗口 | High |
| 鼠标控制 | 移动鼠标、点击、双击、拖拽 | High |
| 键盘输入 | 文本输入、快捷键、特殊键 | High |
| 交互模拟 | 完整的用户操作流程模拟 | Medium |

#### 2.1.3 自动化执行

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 任务调度 | 定时执行自动化任务 | Medium |
| 条件触发 | 基于屏幕状态触发操作 | High |
| 流程编排 | 多步骤自动化流程 | High |
| 异常处理 | 自动处理异常情况 | High |

#### 2.1.4 AI 增强

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 界面理解 | LLM 分析界面截图，理解操作意图 | High |
| 智能决策 | 基于界面状态做出操作决策 | High |
| 错误恢复 | 自动识别并处理操作失败 | Medium |
| 学习能力 | 从用户操作中学习最佳实践 | Low |

### 2.2 非功能需求

| 类别 | 要求 |
|------|------|
| **跨平台** | 支持 macOS (当前) + Windows + Linux |
| **性能** | 屏幕捕获 < 100ms, 操作响应 < 500ms |
| **稳定性** | 7x24 小时运行，自动恢复异常 |
| **安全性** | 操作审计日志，敏感操作二次确认 |
| **可扩展** | 插件化架构，支持自定义操作 |

---

## 3. 系统架构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GUI Agent System                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     GUI Agent Core (Rust)                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐  │  │
│  │  │ Screen      │  │ Automation  │  │ AI Integration        │  │  │
│  │  │ Capture     │  │ Engine      │  │ (LLM)                 │  │  │
│  │  │ - macOS     │  │ - Task      │  │ - Image Analysis      │  │  │
│  │  │ - Windows   │  │ - Scheduler │  │ - Decision Making     │  │  │
│  │  │ - Linux     │  │ - Executor  │  │ - Error Recovery      │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────────┘  │  │
│  │                        │                                          │  │
│  └────────────────────────┼────────────────────────────────────────┘  │
│                           │                                           │
│  ┌────────────────────────▼────────────────────────────────────────┐  │
│  │                  GUI Agent Gateway (HTTP API)                   │  │
│  │  - REST API for desktop automation                              │  │
│  │  - WebSocket for real-time events                               │  │
│  │  - Authentication & Authorization                               │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                           │                                           │
│  ┌────────────────────────▼────────────────────────────────────────┐  │
│  │              zeroclaw-desktop (Electron UI)                     │  │
│  │  - GUI Agent Dashboard                                          │  │
│  │  - Screen Monitor View                                          │  │
│  │  - Automation Flow Editor                                       │  │
│  │  - Task Scheduler                                               │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                           │                                           │
│  ┌────────────────────────▼────────────────────────────────────────┐  │
│  │              ZeroClaw Core (Rust Agent)                         │  │
│  │  - Chat, Swarm, Workflow (existing)                             │  │
│  │  - Tool Integration                                             │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 技术选型

#### 3.2.1 Rust 屏幕捕获库

| 库名 | 优点 | 缺点 | 适用平台 |
|------|------|------|----------|
| **screen-capture-rs** | 成熟、跨平台、活跃维护 | 仅截图，无窗口操作 | macOS, Windows, Linux |
| **mac-screen-control** | macOS 原生支持，功能强大 | 仅 macOS | macOS |
| **windows-rs** | Windows 原生 API | 仅 Windows | Windows |
| **x11-rs** | Linux X11 原生支持 | 仅 Linux/X11 | Linux |

**推荐方案**: **screen-capture-rs** (核心) + 平台特定增强

#### 3.2.2 Rust GUI 自动化库

| 库名 | 优点 | 缺点 | 适用平台 |
|------|------|------|----------|
| **rdev** | 跨平台、轻量 | 功能有限 | macOS, Windows, Linux |
| **maud** | macOS 原生支持 | 仅 macOS | macOS |
| **ui-automation** | Windows UIA 支持 | 仅 Windows | Windows |
| **atspi-rs** | Linux Accessibility | 仅 Linux | Linux |

**推荐方案**: **rdev** (核心) + 平台特定增强

#### 3.2.3 图像识别

| 库名 | 优点 | 缺点 |
|------|------|------|
| **image** | Rust 原生、功能完整 | 需要额外 OCR |
| **tesseract-rs** | OCR 支持 | 依赖 Tesseract |
| **opencv-rs** | 强大的计算机视觉 | 依赖 OpenCV、编译复杂 |

**推荐方案**: **image** + **tesseract-rs** (可选)

### 3.3 模块划分

```
zeroclaw/src/gui/
├── mod.rs                    # 模块入口
├── agent.rs                  # GUI Agent 核心
├── screen/
│   ├── mod.rs                # 屏幕捕获模块
│   ├── capture.rs            # 屏幕截图
│   ├── window.rs             # 窗口管理
│   └── image.rs              # 图像识别
├── automation/
│   ├── mod.rs                # 自动化模块
│   ├── executor.rs           # 操作执行器
│   ├── scheduler.rs          # 任务调度器
│   └── flow.rs               # 流程编排
├── gateway/
│   ├── mod.rs                # Gateway 模块
│   ├── server.rs             # HTTP Server
│   ├── handlers.rs           # API Handlers
│   └── websocket.rs          # WebSocket 服务
└── integration/
    ├── mod.rs                # 集成模块
    ├── zeroclaw_bridge.rs    # 与 ZeroClaw Core 集成
    └── tools.rs              # Tool 集成
```

---

## 4. 核心模块设计

### 4.1 Screen Capture Module

#### 4.1.1 屏幕截图

```rust
pub struct ScreenCapture {
    #[cfg(target_os = "macos")]
    display_id: u32,
    
    #[cfg(target_os = "windows")]
    h_monitor: HANDLE,
}

impl ScreenCapture {
    /// 捕获整个屏幕
    pub fn capture_screen(&self) -> Result<Image<Rgba<u8>>>;
    
    /// 捕获指定区域
    pub fn capture_region(&self, x: u32, y: u32, width: u32, height: u32) -> Result<Image<Rgba<u8>>>;
    
    /// 捕获指定窗口
    pub fn capture_window(&self, window_id: u64) -> Result<Image<Rgba<u8>>>;
    
    /// 获取屏幕分辨率
    pub fn get_resolution(&self) -> (u32, u32);
}
```

#### 4.1.2 窗口管理

```rust
pub struct WindowManager {
    #[cfg(target_os = "macos")]
    ax_app: AXApplication,
    
    #[cfg(target_os = "windows")]
    hwnd_list: Vec<HWND>,
}

impl WindowManager {
    /// 获取所有窗口
    pub fn list_windows(&self) -> Result<Vec<WindowInfo>>;
    
    /// 根据标题查找窗口
    pub fn find_window(&self, title: &str) -> Result<Option<WindowInfo>>;
    
    /// 启动应用
    pub fn launch_app(&self, path: &str) -> Result<WindowInfo>;
    
    /// 激活窗口
    pub fn activate_window(&self, window_id: u64) -> Result<()>;
    
    /// 关闭窗口
    pub fn close_window(&self, window_id: u64) -> Result<()>;
    
    /// 监控窗口变化
    pub fn watch_window(&self, window_id: u64, callback: Box<dyn Fn(WindowEvent)>) -> Result<()>;
}
```

#### 4.1.3 图像识别

```rust
pub struct ImageAnalyzer {
    template_cache: HashMap<String, Image<Rgba<u8>>>,
}

impl ImageAnalyzer {
    /// 加载模板图像
    pub fn load_template(&mut self, name: &str, path: &str) -> Result<()>;
    
    /// 在屏幕上查找模板
    pub fn find_template(&self, screen: &Image<Rgba<u8>>, name: &str) -> Result<Option<Rect>>;
    
    /// OCR 识别
    pub fn ocr_region(&self, image: &Image<Rgba<u8>>) -> Result<String>;
    
    /// 图像相似度比较
    pub fn compare_images(&self, img1: &Image<Rgba<u8>>, img2: &Image<Rgba<u8>>) -> Result<f64>;
}
```

### 4.2 Automation Module

#### 4.2.1 操作执行器

```rust
pub struct AutomationExecutor {
    screen_capture: ScreenCapture,
    window_manager: WindowManager,
}

impl AutomationExecutor {
    /// 鼠标移动
    pub fn move_mouse(&self, x: i32, y: i32) -> Result<()>;
    
    /// 鼠标点击
    pub fn click(&self, x: i32, y: i32) -> Result<()>;
    
    /// 鼠标双击
    pub fn double_click(&self, x: i32, y: i32) -> Result<()>;
    
    /// 鼠标拖拽
    pub fn drag(&self, from_x: i32, from_y: i32, to_x: i32, to_y: i32) -> Result<()>;
    
    /// 键盘输入
    pub fn type_text(&self, text: &str) -> Result<()>;
    
    /// 按键
    pub fn press_key(&self, key: VirtualKey) -> Result<()>;
    
    /// 快捷键
    pub fn hotkey(&self, modifiers: &[VirtualKey], key: VirtualKey) -> Result<()>;
}
```

#### 4.2.2 任务调度器

```rust
pub struct TaskScheduler {
    tasks: RwLock<HashMap<String, ScheduledTask>>,
    cron_scheduler: CronScheduler,
}

impl TaskScheduler {
    /// 添加定时任务
    pub fn add_cron_task(&self, id: &str, cron: &str, action: TaskAction) -> Result<()>;
    
    /// 添加一次性任务
    pub fn add_once_task(&self, id: &str, delay_ms: u64, action: TaskAction) -> Result<()>;
    
    /// 取消任务
    pub fn cancel_task(&self, id: &str) -> Result<()>;
    
    /// 列出任务
    pub fn list_tasks(&self) -> Vec<ScheduledTask>;
}
```

#### 4.2.3 流程编排

```rust
pub struct AutomationFlow {
    steps: Vec<FlowStep>,
    context: FlowContext,
}

impl AutomationFlow {
    /// 添加步骤
    pub fn add_step(&mut self, step: FlowStep);
    
    /// 执行流程
    pub fn execute(&self, executor: &AutomationExecutor) -> Result<FlowResult>;
    
    /// 条件分支
    pub fn if_condition(&mut self, condition: Condition, true_branch: Vec<FlowStep>, false_branch: Vec<FlowStep>);
    
    /// 循环
    pub fn loop_steps(&mut self, max_iterations: u32, steps: Vec<FlowStep>);
}
```

### 4.3 Gateway Module

#### 4.3.1 HTTP API

```rust
pub struct GuiAgentGateway {
    executor: Arc<Mutex<AutomationExecutor>>,
    scheduler: Arc<Mutex<TaskScheduler>>,
}

impl GuiAgentGateway {
    /// 启动 HTTP Server
    pub fn start(&self, port: u16) -> Result<()>;
    
    /// Screen Capture APIs
    pub fn capture_screen(&self) -> Result<ScreenCaptureResponse>;
    pub fn capture_window(&self, window_id: u64) -> Result<ScreenCaptureResponse>;
    
    /// Window Management APIs
    pub fn list_windows(&self) -> Result<Vec<WindowInfo>>;
    pub fn find_window(&self, title: &str) -> Result<Option<WindowInfo>>;
    pub fn launch_app(&self, path: &str) -> Result<WindowInfo>;
    
    /// Automation APIs
    pub fn click(&self, x: i32, y: i32) -> Result<()>;
    pub fn type_text(&self, text: &str) -> Result<()>;
    pub fn execute_flow(&self, flow: AutomationFlow) -> Result<FlowResult>;
}
```

#### 4.3.2 WebSocket Events

```rust
pub enum GuiAgentEvent {
    ScreenCaptured { timestamp: u64, width: u32, height: u32 },
    WindowChanged { window_id: u64, event: WindowEvent },
    TaskStarted { task_id: String },
    TaskCompleted { task_id: String, result: TaskResult },
    TaskFailed { task_id: String, error: String },
    FlowStepExecuted { step_index: usize, result: StepResult },
}
```

### 4.4 Integration Module

#### 4.4.1 ZeroClaw Bridge

```rust
pub struct ZeroClawGuiBridge {
    gui_agent: Arc<Mutex<GuiAgent>>,
    zeroclaw_core: ZeroClawCoreClient,
}

impl ZeroClawGuiBridge {
    /// 将 GUI 操作作为 Tool 暴露给 ZeroClaw
    pub fn register_gui_tools(&self) -> Result<()>;
    
    /// GUI 事件通知 ZeroClaw
    pub fn notify_gui_event(&self, event: GuiAgentEvent);
    
    /// LLM 驱动的 GUI 操作
    pub fn llm_driven_action(&self, instruction: &str) -> Result<()>;
}
```

#### 4.4.2 Tool 集成

```rust
pub struct GuiAgentTools {
    executor: Arc<Mutex<AutomationExecutor>>,
}

impl GuiAgentTools {
    /// 获取所有可用的 GUI Tools
    pub fn get_tools(&self) -> Vec<ToolDefinition>;
    
    /// Tool: 启动应用
    #[tool(name = "launch_app")]
    pub fn launch_app(&self, path: String) -> Result<String>;
    
    /// Tool: 点击屏幕位置
    #[tool(name = "click_screen")]
    pub fn click_screen(&self, x: i32, y: i32) -> Result<String>;
    
    /// Tool: 输入文本
    #[tool(name = "type_text")]
    pub fn type_text(&self, text: String) -> Result<String>;
    
    /// Tool: 截取屏幕
    #[tool(name = "capture_screen")]
    pub fn capture_screen(&self) -> Result<String>;  // 返回 base64 image
}
```

---

## 5. 与现有系统集成

### 5.1 zeroclaw-desktop 集成

#### 5.1.1 新增 Electron 模块

```
zeroclaw-desktop/electron/gui/
├── mod.ts                    # 模块入口
├── screen-capture.ts         # 屏幕捕获
├── window-manager.ts         # 窗口管理
├── automation.ts             # 自动化控制
└── bridge.ts                 # 与 Rust Gateway 通信
```

#### 5.1.2 新增 React 组件

```
zeroclaw-desktop/src/components/gui/
├── ScreenMonitor.tsx         # 屏幕监控视图
├── AutomationFlowEditor.tsx  # 流程编辑器
├── TaskScheduler.tsx         # 任务调度器
└── GuiAgentDashboard.tsx     # GUI Agent 仪表盘
```

#### 5.1.3 新增 State

```typescript
// stores/guiStore.ts
interface GuiState {
  screenCapture: {
    enabled: boolean;
    lastCapture: string | null;  // base64 image
    monitoring: boolean;
  };
  
  automation: {
    tasks: AutomationTask[];
    flows: AutomationFlow[];
    isExecuting: boolean;
  };
  
  windows: WindowInfo[];
  selectedWindow: string | null;
}
```

### 5.2 ZeroClaw Core 集成

#### 5.2.1 新增 Tool

```rust
// src/tools/gui_agent.rs

/// Tool: 启动应用
#[tool(name = "launch_app")]
pub async fn launch_app(path: String) -> Result<String> {
    // 调用 GUI Agent Gateway
}

/// Tool: 截取屏幕
#[tool(name = "capture_screen")]
pub async fn capture_screen(region: Option<ScreenRegion>) -> Result<String> {
    // 返回 base64 image
}

/// Tool: 点击屏幕
#[tool(name = "click_screen")]
pub async fn click_screen(x: i32, y: i32) -> Result<String> {
    // 执行点击操作
}
```

#### 5.2.2 新型 Agent Loop

```rust
// src/agent/loop_.rs

pub async fn gui_agent_loop(
    mut agent: Agent,
    gui_agent: Arc<Mutex<GuiAgent>>,
) -> Result<()> {
    // Agent Loop 增加 GUI 感知
    loop {
        // 1. 状态感知（新增 GUI 状态）
        let gui_state = gui_agent.lock().await.get_state().await?;
        
        // 2. 决策（考虑 GUI 状态）
        let action = agent.decide(&gui_state).await?;
        
        // 3. 执行（可能包含 GUI 操作）
        match action {
            Action::GuiOperation(op) => {
                gui_agent.lock().await.execute(op).await?;
            }
            _ => agent.execute(action).await?,
        }
        
        // 4. 观察（包括 GUI 观察）
        let observation = gui_agent.lock().await.observe().await?;
        agent.observe(observation).await?;
    }
}
```

---

## 6. 安全设计

### 6.1 权限控制

```rust
pub enum GuiPermission {
    ScreenCapture,      // 屏幕截图
    WindowControl,      // 窗口控制
    InputSimulation,    // 输入模拟
    ApplicationLaunch,  // 应用启动
}

pub struct GuiAgentSecurity {
    permissions: RwLock<HashMap<String, GuiPermission>>,
}

impl GuiAgentSecurity {
    /// 检查权限
    pub fn check_permission(&self, agent_id: &str, permission: GuiPermission) -> bool;
    
    /// 授予权限
    pub fn grant_permission(&self, agent_id: &str, permission: GuiPermission);
    
    /// 撤销权限
    pub fn revoke_permission(&self, agent_id: &str, permission: GuiPermission);
}
```

### 6.2 操作审计

```rust
pub struct GuiAgentAudit {
    entries: RwLock<Vec<AuditEntry>>,
}

pub struct AuditEntry {
    pub timestamp: u64,
    pub agent_id: String,
    pub action: String,
    pub parameters: serde_json::Value,
    pub result: AuditResult,
}

pub enum AuditResult {
    Success,
    Failed { error: String },
    Denied { reason: String },
}
```

### 6.3 敏感操作保护

```rust
pub struct SensitiveOperationGuard {
    action: String,
}

impl SensitiveOperationGuard {
    /// 需要用户确认的操作
    pub async fn require_confirmation(&self, message: &str) -> Result<bool>;
    
    /// 限制操作频率
    pub async fn rate_limit(&self, max_per_minute: u32) -> Result<()>;
}
```

---

## 7. 性能优化

### 7.1 屏幕捕获优化

- 使用硬件加速（Metal/Vulkan/DirectX）
- 缓存截图，避免重复捕获
- 增量捕获（仅捕获变化区域）

### 7.2 图像识别优化

- 模板图像预处理（灰度化、降采样）
- 多线程并行识别
- 结果缓存

### 7.3 内存管理

- 屏幕截图使用内存映射
- 图像数据压缩存储
- 自动垃圾回收

---

## 8. 测试策略

### 8.1 单元测试

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_capture_screen() {
        let capture = ScreenCapture::new().unwrap();
        let image = capture.capture_screen().unwrap();
        assert!(image.width() > 0);
        assert!(image.height() > 0);
    }
    
    #[test]
    fn test_find_window() {
        let manager = WindowManager::new().unwrap();
        let window = manager.find_window("Terminal").unwrap();
        assert!(window.is_some());
    }
}
```

### 8.2 集成测试

```rust
#[cfg(test)]
mod integration_tests {
    use super::*;
    
    #[tokio::test]
    async fn test_full_automation_flow() {
        let executor = AutomationExecutor::new().await.unwrap();
        let flow = AutomationFlow::new()
            .add_step(FlowStep::LaunchApp { path: "/Applications/Chrome.app".to_string() })
            .add_step(FlowStep::Wait { ms: 2000 })
            .add_step(FlowStep::Click { x: 100, y: 200 });
        
        let result = flow.execute(&executor).await.unwrap();
        assert!(result.success);
    }
}
```

### 8.3 E2E 测试

```typescript
// tests/e2e/gui-agent.spec.ts
import { test, expect } from '@playwright/test';

test('GUI Agent Screen Capture', async ({ page }) => {
  // 启动 GUI Agent
  const response = await page.request.post('http://localhost:8081/capture/screen');
  expect(response.ok()).toBeTruthy();
  
  // 验证返回的截图
  const data = await response.json();
  expect(data.width).toBeGreaterThan(0);
  expect(data.height).toBeGreaterThan(0);
  expect(data.image).toBeDefined();
});
```

---

## 9. 部署方案

### 9.1 构建流程

```
Rust GUI Agent
   │
   ├── screen-capture-rs ──► macOS, Windows, Linux
   ├── rdev ───────────────► Input Simulation
   └── image ──────────────► Image Processing
   │
   ▼
GUI Agent Gateway (HTTP API)
   │
   ├── REST API ───────────► Automation Control
   └── WebSocket ──────────► Real-time Events
   │
   ▼
zeroclaw-desktop (Electron)
   │
   ├── GUI Dashboard ──────► User Interface
   └── Event Viewer ───────► Monitor Status
```

### 9.2 依赖管理

```toml
# Cargo.toml

[dependencies]
# Screen Capture
screen-capture-rs = "0.3"
[target.'cfg(target_os = "macos")'.dependencies]
mac-screen-control = "0.1"
[target.'cfg(target_os = "windows")'.dependencies]
windows-rs = { version = "0.48", features = ["Win32_UI_WindowsAndMessaging"] }
[target.'cfg(target_os = "linux")'.dependencies]
x11-rs = "0.10"

# Automation
rdev = "0.3"
[target.'cfg(target_os = "macos")'.dependencies]
macos-automation = "0.1"
[target.'cfg(target_os = "windows")'.dependencies]
windows-automation = "0.1"
[target.'cfg(target_os = "linux")'.dependencies]
atspi-rs = "0.6"

# Image Processing
image = { version = "0.24", features = ["png", "jpeg"] }
tesseract-rs = { version = "0.5", optional = true }

# HTTP Server
axum = "0.7"
tokio = { version = "1.0", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

---

## 10. 开发路线图

### Phase 1: MVP (2 周)

- [ ] 屏幕截图基础功能 (1 周)
- [ ] 窗口管理基础功能 (1 周)
- [ ] 鼠标键盘模拟 (1 周)
- [ ] HTTP Gateway 基础 API (1 周)

### Phase 2: 核心功能 (3 周)

- [ ] 图像识别 (1 周)
- [ ] 任务调度 (1 周)
- [ ] 流程编排 (1 周)
- [ ] 与 ZeroClaw Core 集成 (1 周)

### Phase 3: 增强功能 (2 周)

- [ ] AI 集成 (LLM 界面理解) (1 周)
- [ ] 性能优化 (1 周)
- [ ] 安全增强 (1 周)
- [ ] 文档和示例 (1 周)

### Phase 4: 生产就绪 (1 周)

- [ ] E2E 测试 (1 周)
- [ ] 性能测试 (1 周)
- [ ] 文档完善 (1 周)
- [ ] 发布准备 (1 周)

---

## 11. 参考资料

### 11.1 开源项目

- **PyAutoGUI**: https://github.com/asweigart/pyautogui
- **AutoIt**: https://www.autoitscript.com/site/autoit/
- **AppleScript**: https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/introduction/ASLR_intro.html
- **PowerShell UI Automation**: https://github.com/PowerShell/PowerShell

### 11.2 Rust 库

- **screen-capture-rs**: https://github.com/13k/screen-capture-rs
- **rdev**: https://github.com/13k/rdev
- **image**: https://github.com/image-rs/image
- **ax:macos**: https://github.com/13k/ax

---

## 更新履历

| 版本 | 日期 | 更新人 | 更新内容 | 审核状态 |
|------|------|--------|----------|----------|
| v1.0.0 | 2026-03-08 | Architect Agent | 初始版本创建 | 待审核 |
| v1.0.1 | 2026-03-08 | Architect Agent | 更新 GUI Agent Tools 集成到 ZeroClaw，添加 ZeroClaw 架构图 | 已审核 |
