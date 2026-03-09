# ZeroClaw GUI Agent 测试用例

## 文档信息

| 属性 | 值 |
|------|-----|
| **产品名称** | ZeroClaw GUI Agent |
| **版本** | v1.0.0 |
| **文档版本** | v1.0 |
| **最后更新** | 2026-03-08 |
| **作者** | Test Expert Agent |
| **测试类别** | 单元测试用例 + 集成测试用例 + E2E 测试用例 |

---

## 1. 测试用例总览

### 1.1 测试用例统计

| 模块 | 单元测试 | 集成测试 | E2E 测试 | 总计 |
|------|----------|----------|----------|------|
| Screen Capture | 15 | 5 | 3 | 23 |
| Automation | 20 | 6 | 4 | 30 |
| Gateway | 12 | 4 | 2 | 18 |
| Integration | 8 | 3 | 1 | 12 |
| **总计** | **55** | **18** | **10** | **83** |

### 1.2 测试用例优先级

| 优先级 | 数量 | 说明 |
|--------|------|------|
| **P0 (阻塞)** | 30 | 核心功能,必须通过 |
| **P1 (高)** | 35 | 重要功能,优先通过 |
| **P2 (中)** | 15 | 次要功能,建议通过 |
| **P3 (低)** | 3 | 边缘场景,可选通过 |

---

## 2. Screen Capture Module 测试用例

### 2.1 单元测试用例

#### TC-SC-001: 全屏截图功能测试

**用例编号**: TC-SC-001  
**优先级**: P0  
**模块**: Screen Capture  
**测试项**: capture_screen()

**前置条件**:
- 系统有可用的显示设备
- GUI Agent 已初始化

**测试步骤**:
1. 创建 ScreenCapture 实例
2. 调用 capture_screen() 方法
3. 验证返回结果

**预期结果**:
- 返回 Result<Image<Rgba<u8>>>
- 图像宽度 > 0
- 图像高度 > 0
- 图像格式为 Rgba8

**测试数据**:
```rust
let capture = ScreenCapture::new();
let image = capture.capture_screen().unwrap();
assert!(image.width() > 0);
assert!(image.height() > 0);
assert_eq!(image.color(), ColorType::Rgba8);
```

**后置条件**: 无

---

#### TC-SC-002: 区域截图功能测试

**用例编号**: TC-SC-002  
**优先级**: P0  
**模块**: Screen Capture  
**测试项**: capture_region(x, y, w, h)

**前置条件**:
- 系统有可用的显示设备
- GUI Agent 已初始化

**测试步骤**:
1. 创建 ScreenCapture 实例
2. 获取屏幕分辨率
3. 调用 capture_region(0, 0, 100, 100)
4. 验证返回结果

**预期结果**:
- 返回 Result<Image<Rgba<u8>>>
- 图像宽度 = 100
- 图像高度 = 100
- 图像格式为 Rgba8

**测试数据**:
```rust
let capture = ScreenCapture::new();
let (width, height) = capture.get_resolution();
let image = capture.capture_region(0, 0, 100, 100).unwrap();
assert_eq!(image.width(), 100);
assert_eq!(image.height(), 100);
```

**后置条件**: 无

---

#### TC-SC-003: 窗口截图功能测试

**用例编号**: TC-SC-003  
**优先级**: P0  
**模块**: Screen Capture  
**测试项**: capture_window(window_id)

**前置条件**:
- 系统有可用的显示设备
- 有至少一个窗口处于激活状态
- GUI Agent 已初始化

**测试步骤**:
1. 创建 ScreenCapture 实例
2. 获取窗口列表
3. 选择第一个窗口
4. 调用 capture_window(window_id)
5. 验证返回结果

**预期结果**:
- 返回 Result<Image<Rgba<u8>>>
- 图像宽度 > 0
- 图像高度 > 0
- 图像包含窗口内容

**测试数据**:
```rust
let capture = ScreenCapture::new();
let window_manager = WindowManager::new();
let windows = window_manager.list_windows().unwrap();
if !windows.is_empty() {
    let window_id = windows[0].id;
    let image = capture.capture_window(window_id).unwrap();
    assert!(image.width() > 0);
    assert!(image.height() > 0);
}
```

**后置条件**: 无

---

#### TC-SC-004: 非法区域截图测试

**用例编号**: TC-SC-004  
**优先级**: P1  
**模块**: Screen Capture  
**测试项**: capture_region() 边界条件

**前置条件**:
- 系统有可用的显示设备
- GUI Agent 已初始化

**测试步骤**:
1. 创建 ScreenCapture 实例
2. 测试负坐标参数
3. 测试超出屏幕的坐标
4. 测试零尺寸参数
5. 验证返回结果

**预期结果**:
- 所有非法参数返回 Err
- 错误信息明确描述问题

**测试数据**:
```rust
let capture = ScreenCapture::new();

// 负坐标
let result = capture.capture_region(-1, 0, 100, 100);
assert!(result.is_err());

// 超出屏幕
let result = capture.capture_region(10000, 10000, 100, 100);
assert!(result.is_err());

// 零尺寸
let result = capture.capture_region(0, 0, 0, 0);
assert!(result.is_err());
```

**后置条件**: 无

---

#### TC-SC-005: 分辨率获取测试

**用例编号**: TC-SC-005  
**优先级**: P0  
**模块**: Screen Capture  
**测试项**: get_resolution()

**前置条件**:
- 系统有可用的显示设备
- GUI Agent 已初始化

**测试步骤**:
1. 创建 ScreenCapture 实例
2. 调用 get_resolution()
3. 验证返回结果

**预期结果**:
- 返回 (u32, u32) 元组
- 宽度 > 0
- 高度 > 0
- 与系统实际分辨率一致

**测试数据**:
```rust
let capture = ScreenCapture::new();
let (width, height) = capture.get_resolution();
assert!(width > 0);
assert!(height > 0);
// 验证与系统分辨率一致 (需要平台特定的获取方法)
```

**后置条件**: 无

---

### 2.2 集成测试用例

#### TC-SC-I001: 多线程截图测试

**用例编号**: TC-SC-I001  
**优先级**: P1  
**模块**: Screen Capture  
**测试项**: 并发截图性能

**前置条件**:
- 系统有可用的显示设备
- GUI Agent 已初始化

**测试步骤**:
1. 创建多个 ScreenCapture 实例
2. 同时执行截图操作
3. 记录每个截图的耗时
4. 验证所有截图成功

**预期结果**:
- 所有截图操作成功
- 单个截图耗时 < 100ms
- 无资源竞争或崩溃

**测试数据**:
```rust
let capture1 = ScreenCapture::new();
let capture2 = ScreenCapture::new();
let capture3 = ScreenCapture::new();

let handle1 = thread::spawn(|| capture1.capture_screen());
let handle2 = thread::spawn(|| capture2.capture_screen());
let handle3 = thread::spawn(|| capture3.capture_screen());

let img1 = handle1.join().unwrap().unwrap();
let img2 = handle2.join().unwrap().unwrap();
let img3 = handle3.join().unwrap().unwrap();
```

**后置条件**: 无

---

#### TC-SC-I002: 跨平台兼容性测试

**用例编号**: TC-SC-I002  
**优先级**: P1  
**模块**: Screen Capture  
**测试项**: macOS / Windows / Linux 平台兼容性

**前置条件**:
- 三个平台的测试环境已准备就绪
- GUI Agent 已编译

**测试步骤**:
1. 在 macOS 上运行截图测试
2. 在 Windows 上运行截图测试
3. 在 Linux 上运行截图测试
4. 验证三个平台结果一致

**预期结果**:
- 所有平台截图功能正常
- 图像格式一致
- API 行为一致

**测试数据**:
```rust
#[cfg(target_os = "macos")]
let capture = ScreenCapture::new_macos();

#[cfg(target_os = "windows")]
let capture = ScreenCapture::new_windows();

#[cfg(target_os = "linux")]
let capture = ScreenCapture::new_linux();
```

**后置条件**: 无

---

### 2.3 E2E 测试用例

#### TC-SC-E001: GUI 界面截图测试

**用例编号**: TC-SC-E001  
**优先级**: P0  
**模块**: Screen Capture  
**测试项**: Electron 界面截图

**前置条件**:
- zeroclaw-desktop 已启动
- GUI Agent 服务运行中

**测试步骤**:
1. 打开 zeroclaw-desktop
2. 调用截图 API
3. 验证截图包含 Electron 界面

**预期结果**:
- 截图成功返回
- 图像包含 Electron 界面元素
- 图像清晰可辨

**测试数据**:
```bash
curl -X GET http://localhost:8080/api/capture/screen
```

**后置条件**: 无

---

## 3. Automation Module 测试用例

### 3.1 单元测试用例

#### TC-AUT-001: 鼠标移动测试

**用例编号**: TC-AUT-001  
**优先级**: P0  
**模块**: Automation  
**测试项**: move_mouse(x, y)

**前置条件**:
- GUI Agent 已初始化
- 系统允许自动化输入

**测试步骤**:
1. 创建 AutomationExecutor 实例
2. 获取屏幕分辨率
3. 调用 move_mouse(width / 2, height / 2)
4. 验证鼠标位置

**预期结果**:
- 鼠标移动到指定位置
- 无异常抛出
- 操作耗时 < 50ms

**测试数据**:
```rust
let executor = AutomationExecutor::new();
let (width, height) = executor.get_screen_resolution();
executor.move_mouse(width / 2, height / 2).unwrap();
```

**后置条件**: 无

---

#### TC-AUT-002: 鼠标点击测试

**用例编号**: TC-AUT-002  
**优先级**: P0  
**模块**: Automation  
**测试项**: click(x, y)

**前置条件**:
- GUI Agent 已初始化
- 系统允许自动化输入

**测试步骤**:
1. 创建 AutomationExecutor 实例
2. 调用 click(100, 100)
3. 验证点击事件触发

**预期结果**:
- 点击事件成功触发
- 无异常抛出
- 操作耗时 < 50ms

**测试数据**:
```rust
let executor = AutomationExecutor::new();
executor.click(100, 100).unwrap();
```

**后置条件**: 无

---

#### TC-AUT-003: 键盘输入测试

**用例编号**: TC-AUT-003  
**优先级**: P0  
**模块**: Automation  
**测试项**: type_text(text)

**前置条件**:
- GUI Agent 已初始化
- 系统允许自动化输入
- 有可用的文本输入框

**测试步骤**:
1. 创建 AutomationExecutor 实例
2. 打开文本编辑器
3. 调用 type_text("Hello, GUI Agent!")
4. 验证文本被正确输入

**预期结果**:
- 文本被正确输入
- 无字符丢失或错乱
- 操作耗时与文本长度成正比

**测试数据**:
```rust
let executor = AutomationExecutor::new();
let test_text = "Hello, GUI Agent!";
executor.type_text(test_text).unwrap();
```

**后置条件**: 清理输入的文本

---

#### TC-AUT-004: 快捷键测试

**用例编号**: TC-AUT-004  
**优先级**: P1  
**模块**: Automation  
**测试项**: hotkey(modifiers, key)

**前置条件**:
- GUI Agent 已初始化
- 系统允许自动化输入

**测试步骤**:
1. 创建 AutomationExecutor 实例
2. 调用 hotkey([LControl], C)
3. 验证复制操作执行

**预期结果**:
- 快捷键正确执行
- 无异常抛出
- 操作耗时 < 50ms

**测试数据**:
```rust
let executor = AutomationExecutor::new();
let modifiers = &[VirtualKey::LControl];
executor.hotkey(modifiers, VirtualKey::C).unwrap();
```

**后置条件**: 无

---

#### TC-AUT-005: 拖拽操作测试

**用例编号**: TC-AUT-005  
**优先级**: P1  
**模块**: Automation  
**测试项**: drag(from_x, from_y, to_x, to_y)

**前置条件**:
- GUI Agent 已初始化
- 系统允许自动化输入

**测试步骤**:
1. 创建 AutomationExecutor 实例
2. 调用 drag(0, 0, 100, 100)
3. 验证拖拽操作完成

**预期结果**:
- 拖拽操作成功
- 无异常抛出
- 操作耗时 < 100ms

**测试数据**:
```rust
let executor = AutomationExecutor::new();
executor.drag(0, 0, 100, 100).unwrap();
```

**后置条件**: 无

---

### 3.2 集成测试用例

#### TC-AUT-I001: 复杂自动化流程测试

**用例编号**: TC-AUT-I001  
**优先级**: P1  
**模块**: Automation  
**测试项**: 多步骤自动化流程

**前置条件**:
- GUI Agent 已初始化
- 有可用的测试应用

**测试步骤**:
1. 创建自动化流程
2. 添加多个操作步骤
3. 执行自动化流程
4. 验证流程执行结果

**预期结果**:
- 流程正确执行
- 所有步骤成功完成
- 无中间错误

**测试数据**:
```rust
let mut flow = AutomationFlow::new();
flow.add_step(FlowStep::Click { x: 100, y: 100 });
flow.add_step(FlowStep::TypeText { text: "test".to_string() });
flow.add_step(FlowStep::Wait { ms: 1000 });
flow.add_step(FlowStep::Click { x: 200, y: 200 });

let executor = AutomationExecutor::new();
let result = flow.execute(&executor).unwrap();
assert!(result.success);
```

**后置条件**: 清理测试应用

---

#### TC-AUT-I002: 异常处理测试

**用例编号**: TC-AUT-I002  
**优先级**: P1  
**模块**: Automation  
**测试项**: 异常情况处理

**前置条件**:
- GUI Agent 已初始化

**测试步骤**:
1. 测试无效的坐标
2. 测试系统权限不足
3. 测试设备不可用
4. 验证错误处理

**预期结果**:
- 所有异常被正确捕获
- 错误信息明确
- 系统不崩溃

**测试数据**:
```rust
let executor = AutomationExecutor::new();

// 无效坐标
let result = executor.click(i32::MAX, i32::MAX);
assert!(result.is_err());

// 权限不足 (需要模拟)
// let result = executor.click(100, 100);
// assert!(result.is_err());
```

**后置条件**: 无

---

### 3.3 E2E 测试用例

#### TC-AUT-E001: 自动化任务执行测试

**用例编号**: TC-AUT-E001  
**优先级**: P0  
**模块**: Automation  
**测试项**: 通过 GUI 执行自动化任务

**前置条件**:
- zeroclaw-desktop 已启动
- GUI Agent 服务运行中
- 有预定义的自动化任务

**测试步骤**:
1. 打开 zeroclaw-desktop
2. 选择自动化任务
3. 点击执行按钮
4. 观察任务执行过程
5. 验证任务执行结果

**预期结果**:
- 任务正确执行
- 界面状态正确更新
- 无错误发生

**测试数据**:
```bash
curl -X POST http://localhost:8080/api/automation/execute \
  -H "Content-Type: application/json" \
  -d '{"task_id": "task-001"}'
```

**后置条件**: 清理任务状态

---

## 4. Gateway Module 测试用例

### 4.1 单元测试用例

#### TC-GW-001: HTTP Server 启动测试

**用例编号**: TC-GW-001  
**优先级**: P0  
**模块**: Gateway  
**测试项**: start(port)

**前置条件**:
- GUI Agent 已初始化
- 端口 8080 可用

**测试步骤**:
1. 创建 GuiAgentGateway 实例
2. 调用 start(8080)
3. 验证 Server 启动成功

**预期结果**:
- Server 成功启动
- 监听端口 8080
- 无错误日志

**测试数据**:
```rust
let executor = Arc::new(Mutex::new(AutomationExecutor::new()));
let scheduler = Arc::new(Mutex::new(TaskScheduler::new()));
let gateway = GuiAgentGateway::new(executor, scheduler);
let result = gateway.start(8080);
assert!(result.is_ok());
```

**后置条件**: 关闭 Server

---

#### TC-GW-002: 屏幕截图 API 测试

**用例编号**: TC-GW-002  
**优先级**: P0  
**模块**: Gateway  
**测试项**: GET /api/capture/screen

**前置条件**:
- GUI Agent Gateway 运行中
- 端口 8080 可用

**测试步骤**:
1. 发送 GET 请求到 /api/capture/screen
2. 验证响应状态
3. 解析响应体
4. 验证截图数据

**预期结果**:
- 响应状态 200
- 返回 base64 编码的图像
- 图像数据有效

**测试数据**:
```bash
curl -X GET http://localhost:8080/api/capture/screen
```

**后置条件**: 无

---

#### TC-GW-003: 点击 API 测试

**用例编号**: TC-GW-003  
**优先级**: P0  
**模块**: Gateway  
**测试项**: POST /api/click

**前置条件**:
- GUI Agent Gateway 运行中
- 端口 8080 可用

**测试步骤**:
1. 发送 POST 请求到 /api/click
2. 请求体包含 x 和 y 坐标
3. 验证响应状态
4. 验证点击操作执行

**预期结果**:
- 响应状态 200
- 点击操作成功执行
- 无错误日志

**测试数据**:
```bash
curl -X POST http://localhost:8080/api/click \
  -H "Content-Type: application/json" \
  -d '{"x": 100, "y": 100}'
```

**后置条件**: 无

---

#### TC-GW-004: 窗口列表 API 测试

**用例编号**: TC-GW-004  
**优先级**: P1  
**模块**: Gateway  
**测试项**: GET /api/windows

**前置条件**:
- GUI Agent Gateway 运行中
- 有至少一个窗口处于激活状态

**测试步骤**:
1. 发送 GET 请求到 /api/windows
2. 验证响应状态
3. 解析响应体
4. 验证窗口列表

**预期结果**:
- 响应状态 200
- 返回窗口列表
- 列表包含至少一个窗口

**测试数据**:
```bash
curl -X GET http://localhost:8080/api/windows
```

**后置条件**: 无

---

#### TC-GW-005: WebSocket 连接测试

**用例编号**: TC-GW-005  
**优先级**: P1  
**模块**: Gateway  
**测试项**: WebSocket /ws

**前置条件**:
- GUI Agent Gateway 运行中
- 端口 8080 可用

**测试步骤**:
1. 建立 WebSocket 连接到 /ws
2. 验证连接成功
3. 发送测试消息
4. 验证响应

**预期结果**:
- 连接成功建立
- 消息正确传递
- 无连接错误

**测试数据**:
```javascript
const ws = new WebSocket('ws://localhost:8080/ws');
ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'ping' }));
};
ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  assert.equal(response.type, 'pong');
};
```

**后置条件**: 关闭 WebSocket 连接

---

### 4.2 集成测试用例

#### TC-GW-I001: 并发请求处理测试

**用例编号**: TC-GW-I001  
**优先级**: P1  
**模块**: Gateway  
**测试项**: 并发请求处理能力

**前置条件**:
- GUI Agent Gateway 运行中
- 端口 8080 可用

**测试步骤**:
1. 同时发送 100 个请求
2. 记录每个请求的响应时间
3. 统计成功和失败的请求数
4. 验证性能指标

**预期结果**:
- 成功率 > 95%
- 平均响应时间 < 100ms
- 无服务器崩溃

**测试数据**:
```bash
# 使用 ab (Apache Bench) 进行压力测试
ab -n 100 -c 10 http://localhost:8080/api/capture/screen
```

**后置条件**: 无

---

#### TC-GW-I002: 认证授权测试

**用例编号**: TC-GW-I002  
**优先级**: P1  
**模块**: Gateway  
**测试项**: API 认证和授权

**前置条件**:
- GUI Agent Gateway 运行中
- 认证已启用

**测试步骤**:
1. 发送未认证的请求
2. 发送无效 token 的请求
3. 发送有效 token 的请求
4. 验证访问控制

**预期结果**:
- 未认证请求返回 401
- 无效 token 返回 403
- 有效 token 返回 200

**测试数据**:
```bash
# 未认证请求
curl -X GET http://localhost:8080/api/capture/screen

# 有效认证请求
curl -X GET http://localhost:8080/api/capture/screen \
  -H "Authorization: Bearer valid_token"
```

**后置条件**: 无

---

### 4.3 E2E 测试用例

#### TC-GW-E001: 完整工作流测试

**用例编号**: TC-GW-E001  
**优先级**: P0  
**模块**: Gateway  
**测试项**: 完整的 GUI Agent 工作流

**前置条件**:
- zeroclaw-desktop 已启动
- GUI Agent 服务运行中

**测试步骤**:
1. 启动 GUI Agent
2. 捕获屏幕
3. 执行自动化操作
4. 查看事件流
5. 验证所有步骤成功

**预期结果**:
- 所有步骤成功执行
- 无错误发生
- 性能指标达标

**测试数据**:
```bash
# 1. 启动 GUI Agent
curl -X POST http://localhost:8080/api/gateway/start

# 2. 捕获屏幕
curl -X GET http://localhost:8080/api/capture/screen

# 3. 执行自动化操作
curl -X POST http://localhost:8080/api/click \
  -H "Content-Type: application/json" \
  -d '{"x": 100, "y": 100}'

# 4. 查看事件流
ws://localhost:8080/ws
```

**后置条件**: 关闭 GUI Agent

---

## 5. Integration Module 测试用例

### 5.1 单元测试用例

#### TC-INT-001: ZeroClaw Bridge 注册测试

**用例编号**: TC-INT-001  
**优先级**: P0  
**模块**: Integration  
**测试项**: register_gui_tools()

**前置条件**:
- GUI Agent 已初始化
- ZeroClaw Core 已启动

**测试步骤**:
1. 创建 ZeroClawGuiBridge 实例
2. 调用 register_gui_tools()
3. 验证 Tools 注册成功

**预期结果**:
- Tools 注册成功
- 无错误日志
- Tools 可被 ZeroClaw 调用

**测试数据**:
```rust
let gui_agent = Arc::new(Mutex::new(GuiAgent::new()));
let bridge = ZeroClawGuiBridge::new(gui_agent);
let result = bridge.register_gui_tools();
assert!(result.is_ok());
```

**后置条件**: 清理注册的 Tools

---

#### TC-INT-002: 事件通知测试

**用例编号**: TC-INT-002  
**优先级**: P1  
**模块**: Integration  
**测试项**: notify_gui_event()

**前置条件**:
- GUI Agent 已初始化
- ZeroClaw Core 已启动

**测试步骤**:
1. 创建 GUI Agent 事件
2. 调用 notify_gui_event()
3. 验证事件被 ZeroClaw 接收

**预期结果**:
- 事件正确传递
- ZeroClaw 正确处理事件
- 无事件丢失

**测试数据**:
```rust
let event = GuiAgentEvent::ScreenCaptured {
    timestamp: 1234567890,
    width: 1920,
    height: 1080,
};
bridge.notify_gui_event(event);
```

**后置条件**: 无

---

#### TC-INT-003: LLM 驱动测试

**用例编号**: TC-INT-003  
**优先级**: P1  
**模块**: Integration  
**测试项**: llm_driven_action()

**前置条件**:
- GUI Agent 已初始化
- ZeroClaw Core 已启动
- LLM 服务可用

**测试步骤**:
1. 调用 llm_driven_action("点击屏幕中心")
2. 验证 GUI 操作执行

**预期结果**:
- GUI 操作正确执行
- 无错误发生
- 操作符合指令意图

**测试数据**:
```rust
let instruction = "点击屏幕中心";
let result = bridge.llm_driven_action(instruction).unwrap();
```

**后置条件**: 无

---

### 5.2 集成测试用例

#### TC-INT-I001: 完整集成测试

**用例编号**: TC-INT-I001  
**优先级**: P0  
**模块**: Integration  
**测试项**: GUI Agent 与 ZeroClaw Core 完整集成

**前置条件**:
- GUI Agent 已初始化
- ZeroClaw Core 已启动
- 所有依赖服务可用

**测试步骤**:
1. 启动 GUI Agent
2. 启动 ZeroClaw Core
3. 注册 GUI Tools
4. 执行 LLM 驱动的 GUI 操作
5. 验证完整流程

**预期结果**:
- 所有组件正常工作
- 数据正确传递
- 性能指标达标

**测试数据**:
```rust
// 完整的集成测试流程
let gui_agent = GuiAgent::new();
let bridge = ZeroClawGuiBridge::new(gui_agent);
bridge.register_gui_tools().unwrap();
bridge.llm_driven_action("启动终端").unwrap();
```

**后置条件**: 清理所有资源

---

### 5.3 E2E 测试用例

#### TC-INT-E001: 端到端自动化测试

**用例编号**: TC-INT-E001  
**优先级**: P0  
**模块**: Integration  
**测试项**: 完整的端到端自动化流程

**前置条件**:
- zeroclaw-desktop 已启动
- GUI Agent 服务运行中
- ZeroClaw Core 运行中

**测试步骤**:
1. 用户发起自动化指令
2. ZeroClaw Core 处理指令
3. GUI Agent 执行自动化操作
4. 结果返回给用户

**预期结果**:
- 自动化流程正确执行
- 结果准确返回
- 无错误发生

**测试数据**:
```bash
# 用户指令
POST /api/agent/invoke
{
  "instruction": "启动终端并执行 ls 命令"
}

# GUI Agent 执行
- 启动终端应用
- 等待终端就绪
- 输入 ls 命令
- 捕获输出结果

# 返回结果
{
  "success": true,
  "output": "...\n"
}
```

**后置条件**: 清理终端进程

---

## 6. 性能测试用例

### 6.1 屏幕捕获性能

#### TC-PERF-SC-001: 单次捕获性能测试

**用例编号**: TC-PERF-SC-001  
**优先级**: P0  
**测试项**: 单次屏幕捕获耗时

**测试步骤**:
1. 执行 100 次屏幕捕获
2. 记录每次耗时
3. 计算平均值、最大值、最小值

**预期结果**:
- 平均耗时 < 100ms
- 最大耗时 < 200ms
- 无异常值

**测试数据**:
```rust
let mut times = Vec::new();
for _ in 0..100 {
    let start = Instant::now();
    let _ = capture.capture_screen().unwrap();
    let elapsed = start.elapsed();
    times.push(elapsed.as_millis());
}
let avg = times.iter().sum::<u128>() / times.len() as u128;
assert!(avg < 100);
```

**后置条件**: 无

---

### 6.2 自动化操作性能

#### TC-PERF-AUT-001: 单次操作性能测试

**用例编号**: TC-PERF-AUT-001  
**优先级**: P0  
**测试项**: 单次自动化操作耗时

**测试步骤**:
1. 执行 100 次鼠标点击
2. 记录每次耗时
3. 计算平均值、最大值、最小值

**预期结果**:
- 平均耗时 < 50ms
- 最大耗时 < 100ms
- 无异常值

**测试数据**:
```rust
let mut times = Vec::new();
for _ in 0..100 {
    let start = Instant::now();
    executor.click(100, 100).unwrap();
    let elapsed = start.elapsed();
    times.push(elapsed.as_millis());
}
let avg = times.iter().sum::<u128>() / times.len() as u128;
assert!(avg < 50);
```

**后置条件**: 无

---

### 6.3 API 性能

#### TC-PERF-GW-001: API 响应性能测试

**用例编号**: TC-PERF-GW-001  
**优先级**: P0  
**测试项**: API 平均响应时间

**测试步骤**:
1. 发送 1000 个请求
2. 记录每个请求的响应时间
3. 计算 P50、P95、P99

**预期结果**:
- P50 < 50ms
- P95 < 200ms
- P99 < 500ms

**测试数据**:
```bash
# 使用 wrk 进行性能测试
wrk -t4 -c100 -d10s http://localhost:8080/api/capture/screen
```

**后置条件**: 无

---

## 7. 安全测试用例

### 7.1 输入验证

#### TC-SEC-001: SQL 注入测试

**用例编号**: TC-SEC-001  
**优先级**: P0  
**测试项**: API 输入验证

**测试步骤**:
1. 发送包含 SQL 注入的请求
2. 验证请求被拒绝

**预期结果**:
- 请求被拒绝
- 返回 400 错误
- 无 SQL 执行

**测试数据**:
```bash
curl -X POST http://localhost:8080/api/click \
  -H "Content-Type: application/json" \
  -d '{"x": "100; DROP TABLE users;"}'
```

**后置条件**: 无

---

#### TC-SEC-002: XSS 攻击测试

**用例编号**: TC-SEC-002  
**优先级**: P0  
**测试项**: API 输入验证

**测试步骤**:
1. 发送包含 XSS 攻击的请求
2. 验证请求被拒绝

**预期结果**:
- 请求被拒绝
- 返回 400 错误
- 无脚本执行

**测试数据**:
```bash
curl -X POST http://localhost:8080/api/click \
  -H "Content-Type: application/json" \
  -d '{"x": "<script>alert(1)</script>"}'
```

**后置条件**: 无

---

### 7.2 权限控制

#### TC-SEC-003: 未授权访问测试

**用例编号**: TC-SEC-003  
**优先级**: P0  
**测试项**: API 权限控制

**测试步骤**:
1. 发送未认证的请求
2. 验证请求被拒绝

**预期结果**:
- 返回 401 错误
- 无敏感信息泄露

**测试数据**:
```bash
curl -X GET http://localhost:8080/api/capture/screen
```

**后置条件**: 无

---

## 8. 测试执行报告模板

### 8.1 单元测试报告

```
单元测试报告
============
日期: 2026-03-08
执行人: Test Expert Agent

测试统计
--------
总用例数: 55
通过: 52
失败: 3
跳过: 0

通过率: 94.5%

失败用例
--------
1. TC-SC-004: 非法区域截图测试 (P1)
   - 失败原因: 边界条件处理不完整
   - 修复状态: 待修复

2. TC-AUT-003: 键盘输入测试 (P0)
   - 失败原因: 特殊字符处理错误
   - 修复状态: 待修复

3. TC-GW-005: WebSocket 连接测试 (P1)
   - 失败原因: 连接超时
   - 修复状态: 待修复

性能指标
--------
屏幕捕获平均耗时: 85ms
自动化操作平均耗时: 45ms
API 平均响应时间: 30ms

覆盖率
--------
Screen Capture: 92%
Automation: 88%
Gateway: 85%
Integration: 80%

结论
----
单元测试通过率 94.5%,主要失败原因是边界条件处理不完整。
建议在下一迭代中修复失败用例。
```

---

## 9. 版本历史

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| v1.0 | 2026-03-08 | Test Expert Agent | 初始版本创建 |
