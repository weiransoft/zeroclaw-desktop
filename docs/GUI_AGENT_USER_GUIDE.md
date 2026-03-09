# GUI Agent 使用指南

## 快速开始

### 安装依赖

```bash
# 克隆仓库
git clone https://github.com/theonlyhennygod/zeroclaw.git
cd zeroclaw

# 构建项目
cargo build --features gui-agent

# 运行测试
cargo test --features gui-agent
```

### 启动服务

```bash
# 启动 GUI Agent 服务
./target/debug/zeroclaw --gui-agent

# 或者使用特定配置
./target/debug/zeroclaw --gui-agent --config config.toml
```

### 配置文件

```toml
# config.toml
[gui_agent]
enabled = true
host = "127.0.0.1"
port = 8080

[gui_agent.screen_capture]
default_format = "png"
quality = 90

[gui_agent.automation]
default_delay_ms = 100
retry_count = 3

[gui_agent.llm]
enabled = true
api_url = "https://api.openai.com/v1/chat/completions"
api_key = "sk-..."
```

## 功能说明

### 屏幕捕获

#### 全屏截图

```bash
# REST API
curl -X GET http://localhost:8080/api/v1/capture/screen

# WebSocket
{
  "type": "capture_screen"
}
```

#### 区域截图

```bash
# REST API
curl -X POST http://localhost:8080/api/v1/capture/region \
  -H "Content-Type: application/json" \
  -d '{"x": 0, "y": 0, "width": 100, "height": 100}'

# WebSocket
{
  "type": "capture_region",
  "x": 0,
  "y": 0,
  "width": 100,
  "height": 100
}
```

#### 窗口截图

```bash
# REST API
curl -X POST http://localhost:8080/api/v1/capture/window \
  -H "Content-Type: application/json" \
  -d '{"window_id": 1234}'

# WebSocket
{
  "type": "capture_window",
  "window_id": 1234
}
```

### 自动化控制

#### 鼠标操作

```bash
# 移动鼠标
curl -X POST http://localhost:8080/api/v1/automation/mouse/move \
  -H "Content-Type: application/json" \
  -d '{"x": 100, "y": 100}'

# 鼠标点击
curl -X POST http://localhost:8080/api/v1/automation/mouse/click \
  -H "Content-Type: application/json" \
  -d '{"x": 100, "y": 100}'

# 鼠标双击
curl -X POST http://localhost:8080/api/v1/automation/mouse/double_click \
  -H "Content-Type: application/json" \
  -d '{"x": 100, "y": 100}'

# 鼠标拖拽
curl -X POST http://localhost:8080/api/v1/automation/mouse/drag \
  -H "Content-Type: application/json" \
  -d '{"from_x": 0, "from_y": 0, "to_x": 100, "to_y": 100}'
```

#### 键盘操作

```bash
# 输入文本
curl -X POST http://localhost:8080/api/v1/automation/keyboard/type \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, GUI Agent!"}'

# 按键
curl -X POST http://localhost:8080/api/v1/automation/keyboard/press \
  -H "Content-Type: application/json" \
  -d '{"key": "Enter"}'

# 快捷键
curl -X POST http://localhost:8080/api/v1/automation/keyboard/hotkey \
  -H "Content-Type: application/json" \
  -d '{"modifiers": ["Control"], "key": "C"}'
```

### 任务调度

#### 添加定时任务

```bash
# 添加 Cron 任务
curl -X POST http://localhost:8080/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task-001",
    "type": "cron",
    "expression": "0 * * * *",
    "action": {
      "type": "click",
      "x": 100,
      "y": 100
    }
  }'
```

#### 添加一次性任务

```bash
# 添加一次性任务
curl -X POST http://localhost:8080/api/v1/tasks/once \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task-002",
    "delay_ms": 5000,
    "action": {
      "type": "type_text",
      "text": "Hello"
    }
  }'
```

#### 查看任务

```bash
# 查看所有任务
curl -X GET http://localhost:8080/api/v1/tasks

# 查看特定任务
curl -X GET http://localhost:8080/api/v1/tasks/task-001
```

#### 取消任务

```bash
# 取消任务
curl -X DELETE http://localhost:8080/api/v1/tasks/task-001
```

### 流程编排

#### 创建流程

```bash
# 创建自动化流程
curl -X POST http://localhost:8080/api/v1/flows \
  -H "Content-Type: application/json" \
  -d '{
    "id": "flow-001",
    "steps": [
      {
        "type": "click",
        "x": 100,
        "y": 100
      },
      {
        "type": "wait",
        "ms": 1000
      },
      {
        "type": "type_text",
        "text": "Hello"
      }
    ]
  }'
```

#### 执行流程

```bash
# 执行流程
curl -X POST http://localhost:8080/api/v1/flows/flow-001/execute
```

## 配置说明

### 基础配置

```toml
[gui_agent]
enabled = true
host = "127.0.0.1"
port = 8080
```

### 屏幕捕获配置

```toml
[gui_agent.screen_capture]
default_format = "png"  # png, jpeg, webp
quality = 90            # 0-100 (JPEG/WebP)
```

### 自动化配置

```toml
[gui_agent.automation]
default_delay_ms = 100  # 默认延迟 (毫秒)
retry_count = 3         # 重试次数
```

### LLM 配置

```toml
[gui_agent.llm]
enabled = true
api_url = "https://api.openai.com/v1/chat/completions"
api_key = "sk-..."
```

## API 参考

### REST API

#### 屏幕捕获 API

- `GET /api/v1/capture/screen`: 全屏截图
- `POST /api/v1/capture/region`: 区域截图
- `POST /api/v1/capture/window`: 窗口截图

#### 自动化 API

- `POST /api/v1/automation/mouse/move`: 鼠标移动
- `POST /api/v1/automation/mouse/click`: 鼠标点击
- `POST /api/v1/automation/mouse/double_click`: 鼠标双击
- `POST /api/v1/automation/mouse/drag`: 鼠标拖拽
- `POST /api/v1/automation/keyboard/type`: 键盘输入
- `POST /api/v1/automation/keyboard/press`: 按键
- `POST /api/v1/automation/keyboard/hotkey`: 快捷键

#### 任务管理 API

- `POST /api/v1/tasks`: 添加任务
- `GET /api/v1/tasks`: 查看所有任务
- `GET /api/v1/tasks/{id}`: 查看特定任务
- `DELETE /api/v1/tasks/{id}`: 取消任务

#### 流程管理 API

- `POST /api/v1/flows`: 创建流程
- `GET /api/v1/flows`: 查看所有流程
- `POST /api/v1/flows/{id}/execute`: 执行流程

### WebSocket API

#### 客户端消息

```json
{
  "type": "capture_screen"
}
```

```json
{
  "type": "capture_region",
  "x": 0,
  "y": 0,
  "width": 100,
  "height": 100
}
```

```json
{
  "type": "automation_click",
  "x": 100,
  "y": 100
}
```

#### 服务端消息

```json
{
  "type": "task_status",
  "task_id": "task-001",
  "status": "running",
  "timestamp": 1234567890
}
```

```json
{
  "type": "event",
  "event": "task_completed",
  "task_id": "task-001",
  "timestamp": 1234567890
}
```

## 常见问题

### Q1: macOS 需要什么权限？

**A**: macOS 需要以下权限:
- 屏幕录制权限
- 辅助功能权限

### Q2: Windows 需要什么权限？

**A**: Windows 通常不需要特殊权限,但某些操作可能需要管理员权限。

### Q3: Linux 需要什么权限？

**A**: Linux 需要 X11 访问权限,通常需要在图形环境下运行。

### Q4: 如何提高识别准确率？

**A**: 
- 使用高分辨率截图
- 确保光照充足
- 使用 LLM 辅助识别

### Q5: 如何调试自动化操作？

**A**: 
- 启用详细日志
- 使用监控功能
- 检查权限设置

## 示例项目

### Rust 示例

```rust
use zeroclaw::gui::screen::capture::ScreenCapture;
use zeroclaw::gui::automation::executor::AutomationExecutor;

fn main() {
    // 创建屏幕捕获实例
    let capture = ScreenCapture::new();
    
    // 捕获全屏
    let screen = capture.capture_screen().unwrap();
    
    // 创建自动化执行器
    let executor = AutomationExecutor::new();
    
    // 执行自动化操作
    executor.click(100, 100).unwrap();
    executor.type_text("Hello, GUI Agent!").unwrap();
}
```

### JavaScript 示例

```javascript
// Electron 示例
const { ipcRenderer } = require('electron');

// 截图
ipcRenderer.invoke('gui-agent:screenshot').then((data) => {
  console.log('Screenshot:', data);
});

// 自动化操作
ipcRenderer.invoke('gui-agent:click', { x: 100, y: 100 }).then((result) => {
  console.log('Click result:', result);
});
```

### Python 示例

```python
import requests

# 截图
response = requests.get('http://localhost:8080/api/v1/capture/screen')
data = response.json()
print('Screenshot:', data)

# 自动化操作
response = requests.post('http://localhost:8080/api/v1/automation/mouse/click', 
    json={'x': 100, 'y': 100})
data = response.json()
print('Click result:', data)
```

## 贡献指南

欢迎贡献代码、报告问题或提出建议!

### 开发流程

1. Fork 仓库
2. 创建分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 代码规范

- 遵循 Rust 编码规范
- 添加适当的注释
- 编写单元测试
- 更新文档

## 许可证

MIT License
