# GUI Agent 实现计划

## 当前状态

- ✅ 项目结构已创建
- ✅ 基础模块已实现 (带 TODO 注释)
- ✅ 测试策略已设计
- ✅ 测试用例已编写
- ⏳ 平台特定实现待完成
- ⏳ LLM 客户端待实现
- ⏳ HTTP Gateway 待实现
- ⏳ ZeroClaw 集成待实现

## 实现优先级

### Phase 1: 核心功能 (高优先级)

#### 1. 屏幕捕获实现

##### 1.1 macOS 实现
- [ ] 使用 scap 库实现屏幕捕获
- [ ] 实现区域截图
- [ ] 实现窗口截图
- [ ] 添加错误处理
- [ ] 添加单元测试

##### 1.2 Windows 实现
- [ ] 使用 Windows API 实现屏幕捕获
- [ ] 实现区域截图
- [ ] 实现窗口截图
- [ ] 添加错误处理
- [ ] 添加单元测试

##### 1.3 Linux 实现
- [ ] 使用 X11 实现屏幕捕获
- [ ] 实现区域截图
- [ ] 实现窗口截图
- [ ] 添加错误处理
- [ ] 添加单元测试

#### 2. 窗口管理实现

##### 2.1 macOS 实现
- [ ] 使用 Accessibility API 查找窗口
- [ ] 实现窗口列表获取
- [ ] 实现窗口激活
- [ ] 实现窗口关闭
- [ ] 添加错误处理
- [ ] 添加单元测试

##### 2.2 Windows 实现
- [ ] 使用 Windows API 查找窗口
- [ ] 实现窗口列表获取
- [ ] 实现窗口激活
- [ ] 实现窗口关闭
- [ ] 添加错误处理
- [ ] 添加单元测试

##### 2.3 Linux 实现
- [ ] 使用 X11 查找窗口
- [ ] 实现窗口列表获取
- [ ] 实现窗口激活
- [ ] 实现窗口关闭
- [ ] 添加错误处理
- [ ] 添加单元测试

#### 3. 自动化控制实现

##### 3.1 macOS 实现
- [ ] 使用 Accessibility API 实现鼠标移动
- [ ] 使用 Accessibility API 实现鼠标点击
- [ ] 使用 Accessibility API 实现键盘输入
- [ ] 添加错误处理
- [ ] 添加单元测试

##### 3.2 Windows 实现
- [ ] 使用 Windows API 实现鼠标移动
- [ ] 使用 Windows API 实现鼠标点击
- [ ] 使用 Windows API 实现键盘输入
- [ ] 添加错误处理
- [ ] 添加单元测试

##### 3.3 Linux 实现
- [ ] 使用 X11 实现鼠标移动
- [ ] 使用 X11 实现鼠标点击
- [ ] 使用 X11 实现键盘输入
- [ ] 添加错误处理
- [ ] 添加单元测试

### Phase 2: AI 集成 (中优先级)

#### 4. LLM 客户端实现
- [ ] 实现 LLM 图像 OCR 识别
- [ ] 实现 LLM 辅助图像识别
- [ ] 添加错误处理
- [ ] 添加单元测试

#### 5. Tesseract OCR 集成
- [ ] 集成 Tesseract OCR 库
- [ ] 实现文本识别
- [ ] 添加错误处理
- [ ] 添加单元测试

### Phase 3: 网关实现 (高优先级)

#### 6. HTTP Gateway 实现
- [ ] 实现 REST API 服务
- [ ] 实现 WebSocket 服务
- [ ] 实现 API Handlers
- [ ] 添加认证和授权
- [ ] 添加错误处理
- [ ] 添加单元测试

### Phase 4: 集成实现 (高优先级)

#### 7. ZeroClaw 集成
- [ ] 实现 GUI Agent 核心
- [ ] 实现与 ZeroClaw Core 的集成
- [ ] 实现 Tool 集成
- [ ] 添加错误处理
- [ ] 添加单元测试

### Phase 5: 测试完善 (高优先级)

#### 8. 单元测试完善
- [ ] 补充 Screen Capture 单元测试
- [ ] 补充 Window Manager 单元测试
- [ ] 补充 Automation Executor 单元测试
- [ ] 补充 Task Scheduler 单元测试
- [ ] 补充 Automation Flow 单元测试

#### 9. 集成测试
- [ ] 实现 GUI Agent 集成测试
- [ ] 实现 HTTP Gateway 集成测试

#### 10. E2E 测试
- [ ] 实现 GUI Agent E2E 测试
- [ ] 实现完整场景测试

## 实现步骤

### 步骤 1: macOS 平台实现

#### 1.1 安装依赖
```bash
# macOS 平台需要 Xcode
xcode-select --install
```

#### 1.2 实现屏幕捕获
```rust
// 在 capture.rs 中实现
#[cfg(target_os = "macos")]
fn capture_screen_macos(&self) -> Result<ImageBuffer<Rgba<u8>, Vec<u8>>> {
    // 使用 scap 库
    // TODO: 实现 macOS 屏幕捕获
    unimplemented!("macOS 屏幕捕获待实现")
}
```

#### 1.3 实现窗口管理
```rust
// 在 window.rs 中实现
#[cfg(target_os = "macos")]
fn find_window_macos(&self, title: &str) -> Result<u64> {
    // 使用 Accessibility API
    // TODO: 实现 macOS 窗口查找
    unimplemented!("macOS 窗口查找待实现")
}
```

#### 1.4 实现自动化控制
```rust
// 在 executor.rs 中实现
#[cfg(target_os = "macos")]
fn move_mouse_macos(&self, x: i32, y: i32) -> Result<()> {
    // 使用 Accessibility API
    // TODO: 实现 macOS 鼠标移动
    unimplemented!("macOS 鼠标移动待实现")
}
```

### 步骤 2: Windows 平台实现

#### 2.1 实现屏幕捕获
```rust
// 在 capture.rs 中实现
#[cfg(target_os = "windows")]
fn capture_screen_windows(&self) -> Result<ImageBuffer<Rgba<u8>, Vec<u8>>> {
    // 使用 Windows API
    // TODO: 实现 Windows 屏幕捕获
    unimplemented!("Windows 屏幕捕获待实现")
}
```

#### 2.2 实现窗口管理
```rust
// 在 window.rs 中实现
#[cfg(target_os = "windows")]
fn find_window_windows(&self, title: &str) -> Result<u64> {
    // 使用 Windows API
    // TODO: 实现 Windows 窗口查找
    unimplemented!("Windows 窗口查找待实现")
}
```

#### 2.3 实现自动化控制
```rust
// 在 executor.rs 中实现
#[cfg(target_os = "windows")]
fn move_mouse_windows(&self, x: i32, y: i32) -> Result<()> {
    // 使用 Windows API
    // TODO: 实现 Windows 鼠标移动
    unimplemented!("Windows 鼠标移动待实现")
}
```

### 步骤 3: Linux 平台实现

#### 3.1 实现屏幕捕获
```rust
// 在 capture.rs 中实现
#[cfg(target_os = "linux")]
fn capture_screen_linux(&self) -> Result<ImageBuffer<Rgba<u8>, Vec<u8>>> {
    // 使用 X11
    // TODO: 实现 Linux 屏幕捕获
    unimplemented!("Linux 屏幕捕获待实现")
}
```

#### 3.2 实现窗口管理
```rust
// 在 window.rs 中实现
#[cfg(target_os = "linux")]
fn find_window_linux(&self, title: &str) -> Result<u64> {
    // 使用 X11
    // TODO: 实现 Linux 窗口查找
    unimplemented!("Linux 窗口查找待实现")
}
```

#### 3.3 实现自动化控制
```rust
// 在 executor.rs 中实现
#[cfg(target_os = "linux")]
fn move_mouse_linux(&self, x: i32, y: i32) -> Result<()> {
    // 使用 X11
    // TODO: 实现 Linux 鼠标移动
    unimplemented!("Linux 鼠标移动待实现")
}
```

### 步骤 4: LLM 客户端实现

```rust
// 在 llm.rs 中实现
impl LlmClient {
    pub fn ocr_image(&self, image: &ImageBuffer<Rgba<u8>, Vec<u8>>) -> Result<String> {
        // 实现 LLM 图像 OCR 识别
        // TODO: 实现 LLM 图像 OCR 识别
        unimplemented!("LLM 图像 OCR 识别待实现")
    }
}
```

### 步骤 5: HTTP Gateway 实现

```rust
// 在 server.rs 中实现
pub async fn run_server(host: &str, port: u16) -> Result<()> {
    // 实现 HTTP 服务器
    // TODO: 实现 HTTP 服务器
    unimplemented!("HTTP 服务器待实现")
}
```

### 步骤 6: ZeroClaw 集成实现

```rust
// 在 zeroclaw_bridge.rs 中实现
pub struct ZeroClawBridge {
    // TODO: 实现 ZeroClaw 集成
}

impl ZeroClawBridge {
    pub fn new() -> Self {
        // TODO: 实现 ZeroClaw 集成
        unimplemented!("ZeroClaw 集成待实现")
    }
}
```

## 测试策略

### 单元测试
- 每个模块都需要完整的单元测试
- 使用 `cargo test --lib` 运行
- 代码覆盖率目标: > 80%

### 集成测试
- GUI Agent 集成测试
- HTTP Gateway 集成测试
- 使用 `cargo test --test integration` 运行

### E2E 测试
- 完整场景测试
- 使用 `cargo test --test e2e` 运行

## 代码规范

### Rust 代码规范
- 遵循 Rust 编码规范
- 添加详细的中文注释
- 使用 Result 类型处理错误
- 添加单元测试

### 注释规范
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

## 时间估算

- Phase 1: 3-5 天
- Phase 2: 2-3 天
- Phase 3: 2-3 天
- Phase 4: 2-3 天
- Phase 5: 2-3 天

总计: 11-17 天

## 风险和挑战

1. **平台特定实现**: 需要熟悉 macOS/Windows/Linux 的底层 API
2. **依赖问题**: scap 依赖的 cidre 需要 Xcode
3. **权限问题**: 需要屏幕录制权限和辅助功能权限
4. **性能问题**: 需要优化性能以满足实时性要求

## 下一步行动

1. 选择一个平台 (推荐 macOS) 开始实现
2. 先实现屏幕捕获功能
3. 添加单元测试
4. 逐步实现其他功能
5. 完成集成测试
