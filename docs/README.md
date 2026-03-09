# GUI Agent

GUI Agent 是 ZeroClaw 的核心能力之一,提供 GUI 自动化和屏幕监控功能。

## 功能特性

- ✅ **屏幕捕获**: 支持全屏、区域、窗口截图
- ✅ **窗口管理**: 启动、定位、激活、关闭窗口
- ✅ **自动化控制**: 鼠标、键盘操作模拟
- ✅ **任务调度**: 定时任务、条件触发、流程编排
- ✅ **HTTP Gateway**: REST API + WebSocket 服务
- ✅ **AI 集成**: LLM 驱动的 GUI 操作

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/theonlyhennygod/zeroclaw.git
cd zeroclaw

# 构建项目
cargo build --features gui-agent

# 运行测试
cargo test --features gui-agent
```

### 使用

```bash
# 启动服务
cargo run --bin zeroclaw

# 测试屏幕捕获
curl -X GET http://localhost:8080/api/v1/capture/screen
```

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
│       │   ├── window.rs             # 窗口管理
│       │   └── image.rs              # 图像识别
│       ├── automation/               # 自动化模块
│       │   ├── mod.rs                # 模块入口
│       │   ├── executor.rs           # 操作执行器
│       │   ├── scheduler.rs          # 任务调度器
│       │   └── flow.rs               # 流程编排
│       ├── gateway/                  # Gateway 模块
│       │   ├── mod.rs                # 模块入口
│       │   ├── server.rs             # HTTP Server
│       │   ├── handlers.rs           # API Handlers
│       │   └── websocket.rs          # WebSocket 服务
│       └── integration/              # 集成模块
│           ├── mod.rs                # 模块入口
│           ├── zeroclaw_bridge.rs    # 与 ZeroClaw Core 集成
│           └── tools.rs              # Tool 集成
└── Cargo.toml                        # 项目配置

zeroclaw-desktop/
├── docs/                             # 文档
│   ├── GUI_AGENT_DESIGN.md           # 设计文档
│   ├── GUI_AGENT_TECHNICAL_SOLUTION.md  # 技术方案
│   ├── GUI_AGENT_USER_GUIDE.md       # 用户指南
│   ├── GUI_AGENT_DEPLOYMENT_GUIDE.md  # 部署文档
│   ├── GUI_AGENT_DEVELOPER_GUIDE.md  # 开发者指南
│   ├── IMPLEMENTATION_PLAN.md        # 实现计划
│   └── QUICK_START.md                # 快速开始
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

## 技术栈

- **Rust**: 后端实现
- **scap**: 跨平台屏幕捕获库
- **image**: 图像处理库
- **actix-web**: HTTP 服务器框架
- **tokio**: 异步运行时
- **Electron**: 前端界面

## 平台支持

- ✅ **macOS**: 使用 Quartz Display Services 和 Accessibility API
- ✅ **Windows**: 使用 Windows API 和 UI Automation
- ✅ **Linux**: 使用 X11 和 Accessibility API

## 文档

- [设计文档](./docs/GUI_AGENT_DESIGN.md)
- [技术方案](./docs/GUI_AGENT_TECHNICAL_SOLUTION.md)
- [用户指南](./docs/GUI_AGENT_USER_GUIDE.md)
- [部署文档](./docs/GUI_AGENT_DEPLOYMENT_GUIDE.md)
- [开发者指南](./docs/GUI_AGENT_DEVELOPER_GUIDE.md)
- [实现计划](./docs/IMPLEMENTATION_PLAN.md)
- [快速开始](./docs/QUICK_START.md)

## 测试

```bash
# 运行所有测试
cargo test --features gui-agent

# 运行单元测试
cargo test --features gui-agent --lib

# 运行集成测试
cargo test --features gui-agent --test integration

# 运行 E2E 测试
cargo test --features gui-agent --test e2e
```

## 性能指标

- 屏幕捕获: < 100ms
- 操作响应: < 500ms
- 并发请求: > 100 QPS

## 许可证

MIT License

## 贡献

欢迎贡献代码、报告问题或提出建议!

### 开发流程

1. Fork 仓库
2. 创建分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 联系我们

- **GitHub Issues**: https://github.com/theonlyhennygod/zeroclaw/issues
- **Discord**: https://discord.gg/zeroclaw
- **Email**: support@zeroclaw.dev
