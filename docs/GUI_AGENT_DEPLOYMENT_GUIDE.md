# GUI Agent 部署文档

## 系统要求

### 最低配置

- **CPU**: 2 核心
- **内存**: 4 GB
- **存储**: 1 GB 可用空间
- **网络**: 可访问互联网 (可选,用于 LLM 服务)

### 推荐配置

- **CPU**: 4 核心或更高
- **内存**: 8 GB 或更高
- **存储**: 10 GB 或更高
- **网络**: 稳定的互联网连接

### 支持的操作系统

- **macOS**: 10.15 (Catalina) 或更高
- **Windows**: 10 或更高
- **Linux**: Ubuntu 20.04 或更高,Debian 11 或更高

## 安装步骤

### 从源码编译

#### 1. 安装 Rust

```bash
# macOS
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Ubuntu/Debian
sudo apt update
sudo apt install -y rustc cargo

# CentOS/RHEL
sudo yum install -y rustc cargo
```

#### 2. 克隆仓库

```bash
git clone https://github.com/theonlyhennygod/zeroclaw.git
cd zeroclaw
```

#### 3. 构建项目

```bash
# 开发构建
cargo build --features gui-agent

# 发布构建
cargo build --release --features gui-agent
```

#### 4. 运行测试

```bash
# 运行所有测试
cargo test --features gui-agent

# 运行特定测试
cargo test --features gui-agent -- screen_capture
```

### 使用 Docker

#### 1. 构建 Docker 镜像

```bash
docker build -t zeroclaw-gui-agent .
```

#### 2. 运行容器

```bash
docker run -p 8080:8080 zeroclaw-gui-agent
```

### 从预编译二进制

```bash
# 下载预编译二进制
wget https://github.com/theonlyhennygod/zeroclaw/releases/download/v0.1.0/zeroclaw-gui-agent-x86_64-apple-darwin.tar.gz

# 解压
tar -xzf zeroclaw-gui-agent-x86_64-apple-darwin.tar.gz

# 移动到 PATH
sudo mv zeroclaw-gui-agent /usr/local/bin/
```

## 配置说明

### 基础配置

```toml
# config.toml
[gui_agent]
enabled = true
host = "127.0.0.1"
port = 8080
log_level = "info"
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

### 完整配置示例

```toml
[gui_agent]
enabled = true
host = "0.0.0.0"
port = 8080
log_level = "info"
log_file = "/var/log/zeroclaw/gui-agent.log"

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

[gui_agent.security]
enable_auth = true
api_key = "your-secret-key"
```

## 权限配置

### macOS

#### 1. 屏幕录制权限

```bash
# 打开系统设置
open "System Preferences://privacy/screen"

# 或者使用命令
tccutil reset ScreenCapture com.yourcompany.zeroclaw
```

#### 2. 辅助功能权限

```bash
# 打开系统设置
open "System Preferences://privacy/accessibility"

# 或者使用命令
tccutil reset Accessibility com.yourcompany.zeroclaw
```

### Windows

#### 1. 以管理员身份运行

```powershell
# 以管理员身份运行 PowerShell
Start-Process powershell -Verb runAs

# 运行 GUI Agent
.\zeroclaw-gui-agent.exe
```

#### 2. 防火墙配置

```powershell
# 添加防火墙规则
New-NetFirewallRule -DisplayName "ZeroClaw GUI Agent" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

### Linux

#### 1. X11 访问权限

```bash
# 允许本地 X11 访问
xhost +local:zero

# 或者设置 DISPLAY 环境变量
export DISPLAY=:0
```

#### 2. 辅助功能权限

```bash
# 安装 assistive tools
sudo apt install -y at-spi2-core

# 启用辅助功能
gsettings set org.gnome.desktop.interface accessibility-enabled true
```

## 服务管理

### systemd 服务 (Linux)

```ini
# /etc/systemd/system/zeroclaw-gui-agent.service
[Unit]
Description=ZeroClaw GUI Agent
After=network.target

[Service]
Type=simple
User=zeroclaw
Group=zeroclaw
ExecStart=/usr/local/bin/zeroclaw-gui-agent
Restart=always
RestartSec=5
Environment=DISPLAY=:0

[Install]
WantedBy=multi-user.target
```

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start zeroclaw-gui-agent

# 设置开机自启
sudo systemctl enable zeroclaw-gui-agent

# 查看状态
sudo systemctl status zeroclaw-gui-agent

# 查看日志
sudo journalctl -u zeroclaw-gui-agent -f
```

### launchd 服务 (macOS)

```xml
<!-- ~/Library/LaunchAgents/com.zeroclaw.gui-agent.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.zeroclaw.gui-agent</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/zeroclaw-gui-agent</string>
    </array>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>DISPLAY</key>
        <string>:0</string>
    </dict>
    
    <key>StandardOutPath</key>
    <string>/var/log/zeroclaw/gui-agent.log</string>
    
    <key>StandardErrorPath</key>
    <string>/var/log/zeroclaw/gui-agent-error.log</string>
</dict>
</plist>
```

```bash
# 加载服务
launchctl load ~/Library/LaunchAgents/com.zeroclaw.gui-agent.plist

# 启动服务
launchctl start com.zeroclaw.gui-agent

# 查看状态
launchctl list | grep gui-agent
```

### Windows 服务

```powershell
# 创建服务
New-Service -Name "ZeroClawGUIAgent" -BinaryPathName "C:\Program Files\ZeroClaw\zeroclaw-gui-agent.exe" -DisplayName "ZeroClaw GUI Agent" -StartupType Automatic

# 启动服务
Start-Service ZeroClawGUIAgent

# 查看状态
Get-Service ZeroClawGUIAgent
```

## 监控和日志

### 日志配置

```toml
[gui_agent.logging]
level = "info"
format = "json"
file = "/var/log/zeroclaw/gui-agent.log"
max_size = "100MB"
max_files = 5
```

### 监控指标

```bash
# Prometheus 指标
curl http://localhost:8080/metrics

# 健康检查
curl http://localhost:8080/health

# 版本信息
curl http://localhost:8080/version
```

### 日志分析

```bash
# 查看实时日志
tail -f /var/log/zeroclaw/gui-agent.log

# 搜索错误
grep -i error /var/log/zeroclaw/gui-agent.log

# 统计日志
wc -l /var/log/zeroclaw/gui-agent.log
```

## 安全配置

### TLS 配置

```toml
[gui_agent.tls]
enabled = true
cert_file = "/etc/zeroclaw/cert.pem"
key_file = "/etc/zeroclaw/key.pem"
```

### 认证配置

```toml
[gui_agent.security]
enable_auth = true
api_key = "your-secret-key"
```

### 防火墙配置

```bash
# macOS
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/zeroclaw-gui-agent

# Linux (ufw)
sudo ufw allow 8080/tcp

# Windows
New-NetFirewallRule -DisplayName "ZeroClaw GUI Agent" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

## 故障排除

### 常见问题

#### 1. macOS 屏幕录制权限问题

**问题**: 无法捕获屏幕

**解决方案**:
```bash
# 重置权限
tccutil reset ScreenCapture com.yourcompany.zeroclaw

# 手动授予权限
open "System Preferences://privacy/screen"
```

#### 2. Windows 权限问题

**问题**: 无法执行自动化操作

**解决方案**:
```powershell
# 以管理员身份运行
Start-Process powershell -Verb runAs
```

#### 3. Linux X11 权限问题

**问题**: 无法访问 X11

**解决方案**:
```bash
# 允许本地访问
xhost +local:zero

# 设置 DISPLAY
export DISPLAY=:0
```

### 日志诊断

```bash
# 查看详细日志
grep -i "error\|warning" /var/log/zeroclaw/gui-agent.log

# 搜索特定事件
grep "task" /var/log/zeroclaw/gui-agent.log

# 统计错误
grep -c "error" /var/log/zeroclaw/gui-agent.log
```

### 性能调优

```toml
[gui_agent.performance]
max_concurrent_requests = 100
timeout_ms = 5000
buffer_size = 1024
```

### 调试模式

```bash
# 启用调试日志
./zeroclaw-gui-agent --log-level debug

# 或者使用环境变量
RUST_LOG=debug ./zeroclaw-gui-agent
```

## 更新和维护

### 更新步骤

```bash
# 停止服务
sudo systemctl stop zeroclaw-gui-agent

# 备份配置
cp config.toml config.toml.bak

# 更新二进制
wget https://github.com/theonlyhennygod/zeroclaw/releases/download/v0.1.0/zeroclaw-gui-agent-x86_64-apple-darwin.tar.gz
tar -xzf zeroclaw-gui-agent-x86_64-apple-darwin.tar.gz
sudo mv zeroclaw-gui-agent /usr/local/bin/

# 重启服务
sudo systemctl start zeroclaw-gui-agent

# 验证版本
./zeroclaw-gui-agent --version
```

### 备份配置

```bash
# 备份配置
tar -czf config-backup.tar.gz config.toml

# 恢复配置
tar -xzf config-backup.tar.gz
```

## 升级指南

### 从旧版本升级

```bash
# 1. 停止旧版本
sudo systemctl stop zeroclaw-gui-agent

# 2. 备份数据
cp -r /var/lib/zeroclaw /var/lib/zeroclaw.backup

# 3. 安装新版本
# ... (参考安装步骤)

# 4. 迁移配置
cp /var/lib/zeroclaw.backup/config.toml /etc/zeroclaw/config.toml

# 5. 启动新版本
sudo systemctl start zeroclaw-gui-agent

# 6. 验证升级
./zeroclaw-gui-agent --version
```

## 社区支持

### 获取帮助

- **GitHub Issues**: https://github.com/theonlyhennygod/zeroclaw/issues
- **Discord**: https://discord.gg/zeroclaw
- **Email**: support@zeroclaw.dev

### 贡献指南

- **代码贡献**: https://github.com/theonlyhennygod/zeroclaw/blob/main/CONTRIBUTING.md
- **文档贡献**: https://github.com/theonlyhennygod/zeroclaw-docs

## 许可证

MIT License
