# GUI Agent 开发者指南

## 项目结构

```
zeroclaw/
├── src/
│   └── gui/                          # GUI Agent 模块
│       ├── mod.rs                    # 模块入口
│       ├── agent.rs                  # GUI Agent 核心
│       ├── screen/                   # 屏幕捕获模块
│       │   ├── mod.rs                # 模块入口
│       │   ├── capture.rs            # 屏幕截图
│       │   │   ├── mod.rs            # 模块定义
│       │   │   ├── capture.rs        # 屏幕捕获实现
│       │   │   └── tests.rs          # 单元测试
│       │   ├── window.rs             # 窗口管理
│       │   │   ├── mod.rs            # 模块定义
│       │   │   ├── window.rs         # 窗口管理实现
│       │   │   └── tests.rs          # 单元测试
│       │   └── image.rs              # 图像识别
│       │       ├── mod.rs            # 模块定义
│       │       ├── image.rs          # 图像识别实现
│       │       ├── llm.rs            # LLM 辅助识别
│       │       └── tests.rs          # 单元测试
│       ├── automation/               # 自动化模块
│       │   ├── mod.rs                # 模块入口
│       │   ├── executor.rs           # 操作执行器
│       │   │   ├── mod.rs            # 模块定义
│       │   │   ├── executor.rs       # 执行器实现
│       │   │   └── tests.rs          # 单元测试
│       │   ├── scheduler.rs          # 任务调度器
│       │   │   ├── mod.rs            # 模块定义
│       │   │   ├── scheduler.rs      # 调度器实现
│       │   │   └── tests.rs          # 单元测试
│       │   └── flow.rs               # 流程编排
│       │       ├── mod.rs            # 模块定义
│       │       ├── flow.rs           # 流程编排实现
│       │       └── tests.rs          # 单元测试
│       ├── gateway/                  # Gateway 模块
│       │   ├── mod.rs                # 模块入口
│       │   ├── server.rs             # HTTP Server
│       │   ├── handlers.rs           # API Handlers
│       │   └── websocket.rs          # WebSocket 服务
│       └── integration/              # 集成模块
│           ├── mod.rs                # 模块入口
│           ├── zeroclaw_bridge.rs    # 与 ZeroClaw Core 集成
│           └── tools.rs              # Tool 集成
├── tests/                            # 集成测试
│   ├── gui_agent.rs                  # GUI Agent 集成测试
│   └── gateway.rs                    # Gateway 集成测试
└── Cargo.toml                        # 项目配置

zeroclaw-desktop/
├── docs/                             # 文档
│   ├── GUI_AGENT_DESIGN.md           # 设计文档
│   ├── GUI_AGENT_TECHNICAL_SOLUTION.md  # 技术方案
│   ├── GUI_AGENT_USER_GUIDE.md       # 用户指南
│   ├── GUI_AGENT_DEPLOYMENT_GUIDE.md  # 部署文档
│   ├── GUI_AGENT_DEVELOPMENT_SUMMARY.md  # 开发总结
│   └── GUI_AGENT_DEVELOPER_GUIDE.md  # 本文件
├── tests/                            # 测试
│   └── scripts/                      # 测试脚本
│       ├── test_unit.sh              # 单元测试
│       ├── test_integration.sh       # 集成测试
│       ├── test_e2e.sh               # E2E 测试
│       ├── test_performance.sh       # 性能测试
│       ├── test_security.sh          # 安全测试
│       └── test_all.sh               # 全面测试
└── electron/                         # Electron 前端
    └── core/
        └── zeroclaw-bridge.ts        # ZeroClaw 桥接
```

## 开发环境设置

### 1. 安装 Rust

```bash
# macOS
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Ubuntu/Debian
sudo apt update
sudo apt install -y rustc cargo

# CentOS/RHEL
sudo yum install -y rustc cargo
```

### 2. 克隆仓库

```bash
git clone https://github.com/theonlyhennygod/zeroclaw.git
cd zeroclaw
```

### 3. 构建项目

```bash
# 开发构建
cargo build --features gui-agent

# 发布构建
cargo build --release --features gui-agent
```

### 4. 运行测试

```bash
# 运行所有测试
cargo test --features gui-agent

# 运行特定模块测试
cargo test --features gui-agent -- screen::capture

# 运行特定测试
cargo test --features gui-agent -- test_capture_screen
```

## 代码规范

### Rust 代码规范

#### 1. 命名约定

- **类型**: PascalCase (如 `ScreenCapture`, `AutomationExecutor`)
- **函数**: snake_case (如 `capture_screen`, `move_mouse`)
- **常量**: SCREAMING_SNAKE_CASE (如 `MAX_RETRY_COUNT`)
- **变量**: snake_case (如 `screen_width`, `window_id`)
- **模块**: snake_case (如 `screen`, `automation`)

#### 2. 注释规范

```rust
/// 函数/结构体说明
/// 
/// # 功能特性
/// 
/// - **特性1**: 描述
/// - **特性2**: 描述
/// 
/// # 使用示例
/// 
/// ```rust
/// // 示例代码
/// ```
/// 
/// # 参数
/// 
/// * `param1` - 参数描述
/// * `param2` - 参数描述
/// 
/// # 返回
/// 
/// * `Result<T>` - 返回描述
/// 
/// # 错误
/// 
/// * `ErrorType::Error1` - 错误描述
/// * `ErrorType::Error2` - 错误描述
```

#### 3. 错误处理

```rust
// 使用 Result 类型
pub fn capture_screen(&self) -> Result<ImageBuffer<Rgba<u8>, Vec<u8>>> {
    // ...
}

// 使用自定义错误类型
#[derive(Debug)]
pub enum ScreenCaptureError {
    CaptureFailed(String),
    WindowNotFound(String),
    InvalidParameter(String),
}

impl std::fmt::Display for ScreenCaptureError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ScreenCaptureError::CaptureFailed(msg) => write!(f, "屏幕捕获失败: {}", msg),
            ScreenCaptureError::WindowNotFound(msg) => write!(f, "窗口未找到: {}", msg),
            ScreenCaptureError::InvalidParameter(msg) => write!(f, "参数无效: {}", msg),
        }
    }
}
```

#### 4. 平台特定代码

```rust
// macOS 平台实现
#[cfg(target_os = "macos")]
fn capture_screen_macos(&self) -> Result<ImageBuffer<Rgba<u8>, Vec<u8>>> {
    // macOS 特定实现
    unimplemented!("macOS 屏幕捕获待实现")
}

// Windows 平台实现
#[cfg(target_os = "windows")]
fn capture_screen_windows(&self) -> Result<ImageBuffer<Rgba<u8>, Vec<u8>>> {
    // Windows 特定实现
    unimplemented!("Windows 屏幕捕获待实现")
}

// Linux 平台实现
#[cfg(target_os = "linux")]
fn capture_screen_linux(&self) -> Result<ImageBuffer<Rgba<u8>, Vec<u8>>> {
    // Linux 特定实现
    unimplemented!("Linux 屏幕捕获待实现")
}
```

### 测试规范

#### 1. 单元测试

```rust
/// Screen Capture 单元测试
/// 
/// 本模块提供 Screen Capture 模块的单元测试。

use crate::gui::screen::capture::ScreenCapture;

/// 测试全屏截图功能
#[test]
fn test_capture_screen() {
    let capture = ScreenCapture::new();
    
    // 验证初始化成功
    let (width, height) = capture.get_resolution();
    assert!(width > 0);
    assert!(height > 0);
}

/// 测试非法区域截图
#[test]
fn test_capture_invalid_region() {
    let capture = ScreenCapture::new();
    
    // 负坐标
    let result = capture.capture_region(u32::MAX, 0, 100, 100);
    assert!(result.is_err());
    
    // 超出屏幕
    let result = capture.capture_region(10000, 10000, 100, 100);
    assert!(result.is_err());
}
```

#### 2. 集成测试

```rust
/// GUI Agent 集成测试
/// 
/// 本模块提供 GUI Agent 的集成测试。

use zeroclaw::gui::agent::GuiAgent;
use zeroclaw::gui::automation::executor::AutomationExecutor;

/// 测试 GUI Agent 集成
#[test]
fn test_gui_agent_integration() {
    let agent = GuiAgent::new();
    let executor = AutomationExecutor::new();
    
    // 测试屏幕捕获
    let screen = agent.capture_screen().unwrap();
    assert!(screen.width() > 0);
    assert!(screen.height() > 0);
    
    // 测试自动化操作
    executor.click(100, 100).unwrap();
}
```

### 文档规范

#### 1. API 文档

```rust
/// 屏幕捕获结构体
/// 
/// 提供屏幕截图功能,支持跨平台。
/// 
/// # 平台特定实现
/// 
/// - **macOS**: 使用 Quartz Display Services
/// - **Windows**: 使用 Windows API
/// - **Linux**: 使用 X11
/// 
/// # 使用示例
/// 
/// ```rust
/// use zeroclaw::gui::screen::capture::ScreenCapture;
/// 
/// let capture = ScreenCapture::new();
/// let image = capture.capture_screen().unwrap();
/// ```

pub struct ScreenCapture {
    /// 屏幕分辨率宽度
    width: u32,
    /// 屏幕分辨率高度
    height: u32,
}
```

#### 2. 代码注释

```rust
impl ScreenCapture {
    /// 创建新的屏幕捕获实例
    /// 
    /// # 返回
    /// 
    /// * `ScreenCapture` - 屏幕捕获实例
    /// 
    /// # 示例
    /// 
    /// ```rust
    /// let capture = ScreenCapture::new();
    /// ```
    pub fn new() -> Self {
        // 获取屏幕分辨率
        let (width, height) = Self::get_resolution();
        
        ScreenCapture { width, height }
    }
}
```

## 模块开发指南

### Screen Capture 模块

#### 1. 添加新的屏幕捕获实现

```rust
// 在 capture.rs 中添加新平台支持
#[cfg(target_os = "new_os")]
fn capture_screen_new_os(&self) -> Result<ImageBuffer<Rgba<u8>, Vec<u8>>> {
    // 实现 new_os 平台的屏幕捕获
    unimplemented!("new_os 屏幕捕获待实现")
}
```

#### 2. 添加新的截图格式

```rust
// 在 ScreenCaptureError 中添加新错误类型
#[derive(Debug)]
pub enum ScreenCaptureError {
    // ... 其他错误类型
    UnsupportedFormat(String),
}

// 在 ScreenCapture 中添加新方法
impl ScreenCapture {
    /// 捕获屏幕为指定格式
    pub fn capture_screen_as(&self, format: &str) -> Result<Vec<u8>> {
        match format {
            "png" => self.encode_png(),
            "jpeg" => self.encode_jpeg(),
            "webp" => self.encode_webp(),
            _ => Err(ScreenCaptureError::UnsupportedFormat(format.to_string())),
        }
    }
}
```

### Automation 模块

#### 1. 添加新的自动化操作

```rust
// 在 VirtualKey 枚举中添加新键
pub enum VirtualKey {
    // ... 其他键
    /// 新增键
    NewKey,
}

// 在 AutomationExecutor 中添加新方法
impl AutomationExecutor {
    /// 新增自动化操作
    pub fn new_action(&self, param: i32) -> Result<()> {
        // 实现新操作
        unimplemented!("新操作待实现")
    }
}
```

#### 2. 添加新的调度策略

```rust
// 在 TaskScheduler 中添加新调度策略
impl TaskScheduler {
    /// 添加优先级任务
    pub fn add_priority_task(&mut self, id: &str, priority: u32, action: TaskAction) -> Result<()> {
        // 实现优先级调度
        unimplemented!("优先级任务待实现")
    }
}
```

### Gateway 模块

#### 1. 添加新的 REST API

```rust
// 在 handlers.rs 中添加新 handler
async fn handle_new_api(
    Json(payload): Json<NewApiRequest>,
) -> impl IntoResponse {
    // 实现新 API
    unimplemented!("新 API 待实现")
}
```

#### 2. 添加新的 WebSocket 事件

```rust
// 在 websocket.rs 中添加新事件
async fn handle_new_event(
    ws: WebSocket,
    msg: Message,
) -> Result<(), Error> {
    // 实现新事件处理
    unimplemented!("新事件待实现")
}
```

## 性能优化

### 1. 内存优化

```rust
// 使用引用避免不必要的拷贝
pub fn process_image(&self, image: &ImageBuffer<Rgba<u8>, Vec<u8>>) -> Result<()> {
    // ...
}

// 使用智能指针
use std::sync::Arc;

pub struct ScreenCapture {
    /// 共享资源
    shared: Arc<Mutex<SharedResource>>,
}
```

### 2. 并发优化

```rust
// 使用 tokio 进行异步处理
use tokio::sync::Mutex;

pub async fn capture_screen_async(&self) -> Result<ImageBuffer<Rgba<u8>, Vec<u8>>> {
    // 异步处理
    tokio::spawn(async move {
        // ...
    }).await?
}
```

### 3. 缓存优化

```rust
// 使用 LRU 缓存
use lru::LruCache;

pub struct ImageAnalyzer {
    /// 缓存
    cache: LruCache<String, ImageBuffer<Rgba<u8>, Vec<u8>>>,
}
```

## 调试技巧

### 1. 日志调试

```rust
use tracing::{info, debug, warn, error};

info!("开始屏幕捕获");
debug!("屏幕分辨率: {}x{}", width, height);
warn!("屏幕捕获失败,重试: {}", retry_count);
error!("屏幕捕获最终失败: {}", err);
```

### 2. 性能分析

```bash
# 使用 perf 进行性能分析
cargo install cargo-flamegraph
cargo flamegraph --features gui-agent

# 使用 pprof 进行性能分析
cargo install cargo-pprof
cargo pprof --features gui-agent --bin zeroclaw
```

### 3. 内存分析

```bash
# 使用 valgrind 进行内存分析
cargo install cargo-valgrind
cargo valgrind --features gui-agent
```

## 贡献指南

### 1. Fork 仓库

```bash
# 在 GitHub 上 Fork 仓库
# 然后克隆
git clone https://github.com/your-username/zeroclaw.git
cd zeroclaw
```

### 2. 创建分支

```bash
git checkout -b feature/AmazingFeature
```

### 3. 提交更改

```bash
git add .
git commit -m 'Add some AmazingFeature'
```

### 4. 推送到分支

```bash
git push origin feature/AmazingFeature
```

### 5. 提交 Pull Request

- 描述你的更改
- 提供测试结果
- 更新文档

## 常见问题

### Q1: 如何添加新的平台支持？

**A**: 
1. 在 `capture.rs` 中添加平台特定实现
2. 在 `window.rs` 中添加窗口管理实现
3. 在 `executor.rs` 中添加自动化实现
4. 添加平台特定测试

### Q2: 如何添加新的 API？

**A**: 
1. 在 `handlers.rs` 中添加 handler
2. 在 `server.rs` 中注册路由
3. 添加 API 文档
4. 添加 API 测试

### Q3: 如何优化性能？

**A**: 
1. 使用 profiling 工具分析瓶颈
2. 优化算法和数据结构
3. 使用异步编程
4. 减少内存分配

## 相关文档

- [设计文档](./GUI_AGENT_DESIGN.md)
- [技术方案](./GUI_AGENT_TECHNICAL_SOLUTION.md)
- [用户指南](./GUI_AGENT_USER_GUIDE.md)
- [部署文档](./GUI_AGENT_DEPLOYMENT_GUIDE.md)
- [开发总结](./GUI_AGENT_DEVELOPMENT_SUMMARY.md)

## 许可证

MIT License
