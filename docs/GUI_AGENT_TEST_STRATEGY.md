# ZeroClaw GUI Agent 测试策略

## 文档信息

| 属性 | 值 |
|------|-----|
| **产品名称** | ZeroClaw GUI Agent |
| **版本** | v1.0.0 |
| **文档版本** | v1.0 |
| **最后更新** | 2026-03-08 |
| **作者** | Test Expert Agent |
| **测试类别** | 单元测试 + 集成测试 + 端到端测试 |

---

## 1. 测试目标

### 1.1 质量目标

- **功能正确性**: 所有功能按照需求文档正确实现
- **跨平台兼容性**: macOS / Windows / Linux 平台功能一致
- **性能达标**: 屏幕捕获 < 100ms, 操作响应 < 500ms
- **稳定性**: 7x24 小时运行,错误恢复机制有效
- **安全性**: 敏感操作有审计日志和二次确认

### 1.2 测试范围

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GUI Agent Test Scope                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Unit Tests (Rust)                           │  │
│  │  - Screen Capture Module                                       │  │
│  │  - Automation Module                                           │  │
│  │  - Gateway Module                                              │  │
│  │  - Integration Module                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              Integration Tests (Rust + Electron)               │  │
│  │  - Gateway API Integration                                     │  │
│  │  - IPC Communication                                           │  │
│  │  - End-to-End Workflows                                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              E2E Tests (Electron + Browser)                    │  │
│  │  - UI Interactions                                             │  │
│  │  - User Workflows                                              │  │
│  │  - Cross-platform Scenarios                                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 测试策略

### 2.1 单元测试策略

#### 2.1.1 Screen Capture Module

| 测试类型 | 测试项 | 预期结果 | 覆盖率目标 |
|----------|--------|----------|------------|
| **屏幕截图** | capture_screen() | 成功捕获全屏,图像有效 | 100% |
| **区域截图** | capture_region(x, y, w, h) | 成功捕获指定区域 | 100% |
| **窗口截图** | capture_window(window_id) | 成功捕获指定窗口 | 100% |
| **分辨率获取** | get_resolution() | 返回正确的屏幕分辨率 | 100% |
| **边界条件** | 非法坐标参数 | 返回错误或空结果 | 100% |

**测试用例示例**:
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    /// 测试全屏截图功能
    #[test]
    fn test_capture_screen() {
        let capture = ScreenCapture::new();
        let image = capture.capture_screen().unwrap();
        
        // 验证图像不为空
        assert!(image.width() > 0);
        assert!(image.height() > 0);
        
        // 验证图像格式正确
        assert_eq!(image.color(), ColorType::Rgba8);
    }
    
    /// 测试区域截图功能
    #[test]
    fn test_capture_region() {
        let capture = ScreenCapture::new();
        let (width, height) = capture.get_resolution();
        
        let image = capture.capture_region(0, 0, 100, 100).unwrap();
        
        assert_eq!(image.width(), 100);
        assert_eq!(image.height(), 100);
    }
    
    /// 测试非法区域截图
    #[test]
    fn test_capture_invalid_region() {
        let capture = ScreenCapture::new();
        
        // 负坐标
        let result = capture.capture_region(-1, 0, 100, 100);
        assert!(result.is_err());
        
        // 超出屏幕
        let result = capture.capture_region(10000, 10000, 100, 100);
        assert!(result.is_err());
    }
}
```

#### 2.1.2 Automation Module

| 测试类型 | 测试项 | 预期结果 | 覆盖率目标 |
|----------|--------|----------|------------|
| **鼠标移动** | move_mouse(x, y) | 鼠标移动到指定位置 | 100% |
| **鼠标点击** | click(x, y) | 在指定位置点击 | 100% |
| **双击** | double_click(x, y) | 在指定位置双击 | 100% |
| **拖拽** | drag(from_x, from_y, to_x, to_y) | 完成拖拽操作 | 100% |
| **键盘输入** | type_text(text) | 输入指定文本 | 100% |
| **按键** | press_key(key) | 按下指定按键 | 100% |
| **快捷键** | hotkey(modifiers, key) | 执行快捷键 | 100% |

**测试用例示例**:
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    /// 测试鼠标移动
    #[test]
    fn test_move_mouse() {
        let executor = AutomationExecutor::new();
        
        // 移动到屏幕中心
        let (width, height) = executor.get_screen_resolution();
        executor.move_mouse(width / 2, height / 2).unwrap();
        
        // 验证鼠标位置 (需要平台特定的获取方法)
        // let pos = get_mouse_position();
        // assert_eq!(pos.x, width / 2);
        // assert_eq!(pos.y, height / 2);
    }
    
    /// 测试文本输入
    #[test]
    fn test_type_text() {
        let executor = AutomationExecutor::new();
        
        // 输入测试文本
        let test_text = "Hello, GUI Agent!";
        executor.type_text(test_text).unwrap();
        
        // 验证文本被正确输入 (需要平台特定的验证方法)
    }
    
    /// 测试快捷键
    #[test]
    fn test_hotkey() {
        let executor = AutomationExecutor::new();
        
        // 测试 Ctrl+C
        let modifiers = &[VirtualKey::LControl];
        executor.hotkey(modifiers, VirtualKey::C).unwrap();
        
        // 验证复制操作执行成功
    }
}
```

#### 2.1.3 Gateway Module

| 测试类型 | 测试项 | 预期结果 | 覆盖率目标 |
|----------|--------|----------|------------|
| **HTTP 启动** | start(port) | Server 成功启动 | 100% |
| **屏幕截图 API** | GET /api/capture/screen | 返回 base64 图像 | 100% |
| **窗口列表 API** | GET /api/windows | 返回窗口列表 | 100% |
| **点击 API** | POST /api/click | 执行点击操作 | 100% |
| **WebSocket 连接** | WebSocket /ws | 成功建立连接 | 100% |
| **事件推送** | Event Stream | 正确推送事件 | 100% |

**测试用例示例**:
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use reqwest;
    
    /// 测试 HTTP Server 启动
    #[test]
    fn test_gateway_start() {
        let executor = Arc::new(Mutex::new(AutomationExecutor::new()));
        let scheduler = Arc::new(Mutex::new(TaskScheduler::new()));
        
        let gateway = GuiAgentGateway::new(executor, scheduler);
        let result = gateway.start(8080);
        
        assert!(result.is_ok());
        
        // 清理
        gateway.stop();
    }
    
    /// 测试屏幕截图 API
    #[tokio::test]
    async fn test_capture_screen_api() {
        let gateway = start_test_gateway().await;
        
        let client = reqwest::Client::new();
        let response = client.get("http://localhost:8080/api/capture/screen")
            .send()
            .await
            .unwrap();
        
        assert!(response.status().is_success());
        
        let body = response.text().await.unwrap();
        let capture_response: ScreenCaptureResponse = serde_json::from_str(&body).unwrap();
        
        assert!(!capture_response.image.is_empty());
    }
    
    /// 测试点击 API
    #[tokio::test]
    async fn test_click_api() {
        let gateway = start_test_gateway().await;
        
        let client = reqwest::Client::new();
        let response = client.post("http://localhost:8080/api/click")
            .json(&serde_json::json!({"x": 100, "y": 100}))
            .send()
            .await
            .unwrap();
        
        assert!(response.status().is_success());
    }
}
```

#### 2.1.4 Integration Module

| 测试类型 | 测试项 | 预期结果 | 覆盖率目标 |
|----------|--------|----------|------------|
| **ZeroClaw Bridge** | register_gui_tools() | Tools 注册成功 | 100% |
| **事件通知** | notify_gui_event() | 事件正确传递 | 100% |
| **LLM 驱动** | llm_driven_action() | 执行 LLM 指令 | 100% |
| **Tools 集成** | get_tools() | 返回所有 GUI Tools | 100% |

### 2.2 集成测试策略

#### 2.2.1 Gateway 与 Electron 集成

| 测试类型 | 测试项 | 预期结果 |
|----------|--------|----------|
| **IPC 通信** | Electron ↔ Rust Gateway | 消息正确传递 |
| **状态同步** | GUI State Sync | 状态保持一致 |
| **事件流** | Event Stream | 实时事件推送 |

#### 2.2.2 GUI Agent 与 ZeroClaw Core 集成

| 测试类型 | 测试项 | 预期结果 |
|----------|--------|----------|
| **Tool 调用** | Agent → GUI Tool | Tool 正确执行 |
| **事件监听** | GUI Event → Agent | 事件正确处理 |
| **工作流集成** | Workflow → GUI Action | 流程正确执行 |

### 2.3 端到端测试策略

#### 2.3.1 用户工作流

| 工作流 | 测试步骤 | 预期结果 |
|--------|----------|----------|
| **启动应用** | 1. 打开 GUI Agent<br>2. 输入应用路径<br>3. 点击启动 | 应用成功启动 |
| **自动化任务** | 1. 创建自动化流程<br>2. 配置步骤<br>3. 执行流程 | 流程正确执行 |
| **屏幕监控** | 1. 选择监控窗口<br>2. 启动监控<br>3. 观察状态变化 | 监控正常工作 |

---

## 3. 测试环境

### 3.1 开发环境

```bash
# Rust 测试环境
RUST_BACKTRACE=1
CARGO_INCREMENTAL=0
CARGO_PROFILE=test/opt-level=0

# Electron 测试环境
ELECTRON_ENABLE_LOGGING=1
ELECTRON_ENABLE_STACK_DUMPING=1
```

### 3.2 测试数据

```
tests/data/
├── screenshots/              # 测试截图
│   ├── full_screen.png
│   ├── region.png
│   └── window.png
├── templates/                # 模板图像
│   ├── button.png
│   ├── icon.png
│   └── text_region.png
└── videos/                   # 录屏测试
    └── automation_demo.mp4
```

### 3.3 测试工具

| 工具 | 用途 | 版本 |
|------|------|------|
| **cargo test** | Rust 单元测试 | Latest |
| **mocha/chai** | Node.js 测试 | Latest |
| **playwright** | E2E 测试 | Latest |
| **jest** | React 组件测试 | Latest |

---

## 4. 测试执行

### 4.1 单元测试执行

```bash
# 运行所有单元测试
cargo test --all

# 运行特定模块测试
cargo test --test screen_capture
cargo test --test automation
cargo test --test gateway

# 生成测试覆盖率报告
cargo tarpaulin --workspace
```

### 4.2 集成测试执行

```bash
# 运行集成测试
cargo test --test integration

# 运行端到端测试
npm run test:e2e
```

### 4.3 性能测试

```bash
# 屏幕捕获性能测试
cargo test --test performance capture

# 自动化操作性能测试
cargo test --test performance automation
```

---

## 5. 质量门禁

### 5.1 代码覆盖率

| 模块 | 最低覆盖率 | 测试类型 |
|------|------------|----------|
| Screen Capture | 90% | 单元测试 + 集成测试 |
| Automation | 90% | 单元测试 + 集成测试 |
| Gateway | 85% | 单元测试 + 集成测试 |
| Integration | 80% | 集成测试 |

### 5.2 性能指标

| 指标 | 目标 | 测试方法 |
|------|------|----------|
| 屏幕捕获时间 | < 100ms | 性能测试 |
| 操作响应时间 | < 500ms | 性能测试 |
| 并发请求处理 | > 100 QPS | 压力测试 |
| 内存占用 | < 500MB | 内存测试 |

### 5.3 安全测试

| 测试项 | 要求 | 测试方法 |
|--------|------|----------|
| 敏感操作审计 | 100% 覆盖 | 审计日志检查 |
| 输入验证 | 所有 API | Fuzz 测试 |
| 权限控制 | 关键 API | 权限测试 |

---

## 6. 测试交付物

### 6.1 测试报告

- **单元测试报告**: test-report-unit.xml
- **集成测试报告**: test-report-integration.xml
- **E2E 测试报告**: test-report-e2e.xml
- **性能测试报告**: performance-report.md
- **安全测试报告**: security-report.md

### 6.2 测试覆盖率报告

- **代码覆盖率**: coverage/index.html
- **分支覆盖率**: coverage/branches.html
- **行覆盖率**: coverage/lines.html

### 6.3 性能基准

- **屏幕捕获基准**: benchmarks/capture.md
- **自动化操作基准**: benchmarks/automation.md
- **API 性能基准**: benchmarks/api.md

---

## 7. 测试负责人

| 角色 | 负责人 | 职责 |
|------|--------|------|
| **测试策略设计** | Test Expert Agent | 设计测试策略和用例 |
| **单元测试开发** | Solo Coder Agent | 开发单元测试代码 |
| **集成测试开发** | Solo Coder Agent | 开发集成测试代码 |
| **E2E 测试开发** | Solo Coder Agent | 开发 E2E 测试脚本 |
| **测试报告生成** | Test Expert Agent | 生成测试报告和覆盖率报告 |

---

## 8. 版本历史

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| v1.0 | 2026-03-08 | Test Expert Agent | 初始版本创建 |
