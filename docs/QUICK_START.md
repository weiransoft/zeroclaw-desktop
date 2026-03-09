# GUI Agent 快速开始

## 环境准备

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
cargo build

# 发布构建
cargo build --release
```

### 4. 运行测试

```bash
# 运行所有测试
cargo test

# 运行 GUI Agent 测试
cargo test --lib gui
```

## 快速体验

### 1. 启动 GUI Agent 服务

```bash
# 启动服务
cargo run --bin zeroclaw

# 或者使用特定配置
cargo run --bin zeroclaw -- --config config.toml
```

### 2. 测试屏幕捕获

```bash
# 使用 curl 测试
curl -X GET http://localhost:8080/api/v1/capture/screen
```

### 3. 测试自动化控制

```bash
# 鼠标点击
curl -X POST http://localhost:8080/api/v1/automation/mouse/click \
  -H "Content-Type: application/json" \
  -d '{"x": 100, "y": 100}'
```

## 开发指南

### 1. 添加新功能

```bash
# 创建新分支
git checkout -b feature/new-feature

# 实现功能
# ... (编辑代码)

# 运行测试
cargo test

# 提交更改
git add .
git commit -m 'Add new feature'
```

### 2. 调试代码

```bash
# 使用 gdb 调试
cargo run -- --debug

# 或者使用 lldb
cargo lldb
```

### 3. 性能分析

```bash
# 使用 perf 进行性能分析
cargo install cargo-flamegraph
cargo flamegraph
```

## 常见问题

### Q1: 编译错误

**问题**: 编译时出现错误

**解决方案**:
```bash
# 清理项目
cargo clean

# 重新构建
cargo build
```

### Q2: 测试失败

**问题**: 测试失败

**解决方案**:
```bash
# 运行特定测试
cargo test -- test_name

# 查看详细日志
RUST_LOG=debug cargo test
```

### Q3: 权限问题

**问题**: macOS 需要权限

**解决方案**:
```bash
# 重置权限
tccutil reset ScreenCapture com.yourcompany.zeroclaw
tccutil reset Accessibility com.yourcompany.zeroclaw
```

## 相关文档

- [设计文档](./GUI_AGENT_DESIGN.md)
- [技术方案](./GUI_AGENT_TECHNICAL_SOLUTION.md)
- [用户指南](./GUI_AGENT_USER_GUIDE.md)
- [部署文档](./GUI_AGENT_DEPLOYMENT_GUIDE.md)
- [开发者指南](./GUI_AGENT_DEVELOPER_GUIDE.md)
- [实现计划](./IMPLEMENTATION_PLAN.md)

## 社区支持

- **GitHub Issues**: https://github.com/theonlyhennygod/zeroclaw/issues
- **Discord**: https://discord.gg/zeroclaw
- **Email**: support@zeroclaw.dev

## 许可证

MIT License
