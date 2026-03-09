# GUI Agent 技术方案

## 项目概述

GUI Agent 是 ZeroClaw 的核心能力之一,提供 GUI 自动化和屏幕监控功能。本项目基于 zeroclaw + zeroclaw-desktop 生态系统设计,采用 Rust 实现后端核心功能,与 Electron 前端集成。

## 技术选型

### 核心依赖

#### 屏幕捕获
- **scap** (0.1.0-beta.1): 跨平台屏幕捕获库
  - macOS: 基于 ScreenCaptureKit
  - Windows: 基于 Windows.Graphics.Capture
  - Linux: 基于 X11

#### 图像处理
- **image** (0.24.7): Rust 图像处理库
  - 支持多种图像格式
  - 图像变换和滤镜
  - 模板匹配

#### OCR 识别 (可选)
- **tesseract-rs** (0.1.20): Tesseract OCR Rust 绑定
  - 文本识别
  - 多语言支持

#### HTTP 服务器
- **actix-web** (0.4): 高性能 HTTP 服务器框架
  - REST API
  - WebSocket 支持

#### 异步运行时
- **tokio** (1.0): 异步运行时
  - 并发处理
  - 定时任务

### 平台特定依赖

#### macOS
- **core-graphics**: macOS 图形 API
- **core-foundation**: macOS 基础框架
- **Accessibility API**: 窗口控制

#### Windows
- **windows**: Windows API Rust 绑定
- **UI Automation**: 窗口自动化

#### Linux
- **x11**: X11 库
- **Accessibility API**: 窗口控制

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    GUI Agent Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Screen      │  │  Automation  │  │   Gateway    │      │
│  │  Capture     │  │  Executor    │  │  HTTP + WS   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │  Window      │  │   Scheduler  │                         │
│  │  Manager     │  │              │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    ZeroClaw Core                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Agent      │  │   Tools      │  │   Memory     │      │
│  │   Manager    │  │   Manager    │  │   Store      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Electron Frontend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  Task Editor │  │  Monitor     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 模块设计

#### Screen Capture 模块
- **ScreenCapture**: 屏幕捕获核心
  - `capture_screen()`: 全屏截图
  - `capture_region(x, y, width, height)`: 区域截图
  - `capture_window(window_id)`: 窗口截图
  - `get_resolution()`: 获取屏幕分辨率

#### Window Manager 模块
- **WindowManager**: 窗口管理核心
  - `find_window(title)`: 查找窗口
  - `list_windows()`: 列出所有窗口
  - `activate_window(window_id)`: 激活窗口
  - `close_window(window_id)`: 关闭窗口
  - `get_window_bounds(window_id)`: 获取窗口边界

#### Automation Executor 模块
- **AutomationExecutor**: 自动化执行核心
  - `move_mouse(x, y)`: 鼠标移动
  - `click(x, y)`: 鼠标点击
  - `double_click(x, y)`: 鼠标双击
  - `drag(from_x, from_y, to_x, to_y)`: 鼠标拖拽
  - `type_text(text)`: 键盘输入文本
  - `press_key(key)`: 按键
  - `hotkey(modifiers, key)`: 快捷键

#### Task Scheduler 模块
- **TaskScheduler**: 任务调度核心
  - `add_cron_task(id, cron_expr, action)`: 添加定时任务
  - `add_once_task(id, delay_ms, action)`: 添加一次性任务
  - `cancel_task(id)`: 取消任务
  - `list_tasks()`: 列出所有任务

#### Automation Flow 模块
- **AutomationFlow**: 流程编排核心
  - `add_step(step)`: 添加步骤
  - `if_condition(condition, then_steps, else_steps)`: 条件分支
  - `loop_steps(count, steps)`: 循环控制

#### Gateway 模块
- **HTTP Server**: REST API 服务
  - `/api/v1/capture/screen`: 全屏截图
  - `/api/v1/capture/region`: 区域截图
  - `/api/v1/capture/window`: 窗口截图
  - `/api/v1/automation/mouse`: 鼠标操作
  - `/api/v1/automation/keyboard`: 键盘操作
  - `/api/v1/tasks`: 任务管理
  - `/api/v1/flows`: 流程管理

- **WebSocket Server**: 实时通信
  - 任务状态推送
  - 事件通知

### 数据流设计

#### 屏幕捕获流程
```
1. 用户请求截图
   │
   ▼
2. ScreenCapture.capture_screen()
   │
   ▼
3. 平台特定实现 (macOS/Windows/Linux)
   │
   ▼
4. 返回 ImageBuffer<Rgba<u8>, Vec<u8>>
   │
   ▼
5. 可选: ImageAnalyzer.ocr_region()
   │
   ▼
6. 返回识别结果
```

#### 自动化执行流程
```
1. 用户请求自动化操作
   │
   ▼
2. AutomationExecutor.execute(action)
   │
   ▼
3. 平台特定实现 (macOS/Windows/Linux)
   │
   ▼
4. 执行操作 (鼠标/键盘)
   │
   ▼
5. 返回执行结果
```

#### 任务调度流程
```
1. 用户添加任务
   │
   ▼
2. TaskScheduler.add_task(task)
   │
   ▼
3. 存储任务配置
   │
   ▼
4. 定时器触发
   │
   ▼
5. 执行任务动作
   │
   ▼
6. 返回执行结果
```

## API 设计

### REST API

#### 屏幕捕获 API
```http
GET /api/v1/capture/screen
Content-Type: application/json

Response:
{
  "success": true,
  "data": {
    "image": "base64_encoded_image",
    "width": 1920,
    "height": 1080
  }
}
```

```http
POST /api/v1/capture/region
Content-Type: application/json

Request:
{
  "x": 0,
  "y": 0,
  "width": 100,
  "height": 100
}

Response:
{
  "success": true,
  "data": {
    "image": "base64_encoded_image",
    "width": 100,
    "height": 100
  }
}
```

#### 自动化 API
```http
POST /api/v1/automation/mouse/click
Content-Type: application/json

Request:
{
  "x": 100,
  "y": 100
}

Response:
{
  "success": true
}
```

```http
POST /api/v1/automation/keyboard/type
Content-Type: application/json

Request:
{
  "text": "Hello, GUI Agent!"
}

Response:
{
  "success": true
}
```

#### 任务管理 API
```http
POST /api/v1/tasks
Content-Type: application/json

Request:
{
  "id": "task-001",
  "type": "cron",
  "expression": "* * * * *",
  "action": {
    "type": "click",
    "x": 100,
    "y": 100
  }
}

Response:
{
  "success": true
}
```

```http
GET /api/v1/tasks
Content-Type: application/json

Response:
{
  "success": true,
  "data": [
    {
      "id": "task-001",
      "type": "cron",
      "expression": "* * * * *",
      "action": {...}
    }
  ]
}
```

### WebSocket API

#### 任务状态推送
```json
{
  "type": "task_status",
  "task_id": "task-001",
  "status": "running",
  "timestamp": 1234567890
}
```

#### 事件通知
```json
{
  "type": "event",
  "event": "task_completed",
  "task_id": "task-001",
  "timestamp": 1234567890
}
```

## 测试策略

### 单元测试
- Screen Capture 单元测试
- Window Manager 单元测试
- Automation Executor 单元测试
- Task Scheduler 单元测试
- Automation Flow 单元测试

### 集成测试
- GUI Agent 集成测试
- HTTP Gateway 集成测试

### E2E 测试
- GUI Agent E2E 测试

### 性能测试
- 屏幕捕获性能测试
- 自动化操作性能测试

### 安全测试
- GUI Agent 安全测试

## 部署方案

### 开发环境
```bash
# 安装依赖
cargo build --features gui-agent

# 运行测试
cargo test --features gui-agent
```

### 生产环境
```bash
# 构建发布版本
cargo build --release --features gui-agent

# 运行服务
./target/release/zeroclaw-gui-agent
```

### Electron 集成
```typescript
// zeroclaw-bridge.ts
import { BrowserWindow, ipcMain } from 'electron';

// 启动 GUI Agent 服务
const guiAgentProcess = spawn('./zeroclaw-gui-agent', [], {
  detached: true,
  stdio: 'ignore'
});

// 与 GUI Agent 通信
ipcMain.handle('gui-agent:screenshot', async () => {
  const response = await fetch('http://localhost:8080/api/v1/capture/screen');
  return await response.json();
});
```

## 性能指标

- 屏幕捕获: < 100ms
- 操作响应: < 500ms
- 并发请求: > 100 QPS

## 安全考虑

1. **权限控制**: macOS 需要屏幕录制权限
2. **输入模拟**: 需要辅助功能权限
3. **API 认证**: REST API 需要认证
4. **输入验证**: 所有输入需要验证

## 扩展性

1. **插件机制**: 支持自定义插件
2. **脚本支持**: 支持 JavaScript 脚本
3. **模板系统**: 支持任务模板
4. **云同步**: 支持任务云同步

## 未来规划

1. **平台支持**: 支持更多平台 (Android, iOS)
2. **AI 集成**: 深度集成 LLM
3. **自动化场景**: 提供更多预设场景
4. **可视化编辑**: 提供可视化任务编辑器
