# ZeroClaw Desktop

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-28.2.2-47848F?logo=electron)](https://www.electronjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.1.2-646CFF?logo=vite)](https://vitejs.dev/)

ZeroClaw Desktop 是为 ZeroClaw AI Agent 系统写的桌面客户端，提供直观的图形界面来管理、监控和交互 AI 智能体。
目前因为时间关系，测试并没有完全完成，但持续更新。
## 🌟 特性

- **对话管理** - 支持多会话对话，实时消息流式输出
- **智能体群聊** - 监控多个智能体的协同工作，查看共识决策
- **工作流管理** - 可视化创建和管理 AI 工作流
- **技能中心** - 浏览、安装和管理 ZeroClaw 技能
- **实时监控** - 查看系统状态、Token 使用和性能指标
- **响应式设计** - 支持深色/浅色主题，自适应布局

## 📋 目录

- [特性](#-特性)
- [架构](#-架构)
- [安装](#-安装)
- [使用](#-使用)
- [开发](#-开发)
- [贡献](#-贡献)
- [安全](#-安全)
- [许可证](#-许可证)

## 🏗️ 架构

ZeroClaw Desktop 采用 Electron + React 技术栈，实现跨平台桌面应用：

```
┌─────────────────────────────────────────────────────────────────┐
│                        ZeroClaw Desktop                          │
├─────────────────────────────────────────────────────────────────┤
│                          渲染进程 (React)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Chat View  │  │ Swarm View  │  │Workflow View│              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐              │
│  │  useChat    │  │  useSwarm   │  │ useWorkflow │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│  ┌──────▼────────────────▼────────────────▼──────┐              │
│  │              Zustand Stores                    │              │
│  └───────────────────────┬───────────────────────┘              │
│                          │                                       │
│  ┌───────────────────────▼───────────────────────┐              │
│  │           window.zeroclaw API                  │              │
│  └───────────────────────┬───────────────────────┘              │
└──────────────────────────┼──────────────────────────────────────┘
                           │ IPC (contextBridge)
┌──────────────────────────┼──────────────────────────────────────┐
│                          │                                       │
│                     Preload Script                               │
│                          │                                       │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                        主进程 (Electron)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    IPC Handlers                            │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                  ZeroClaw Bridge                           │  │
│  │              (进程通信 + 消息解析)                           │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                    Database                                │  │
│  │                  (electron-store)                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                           │
                           │ stdin/stdout (JSON)
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    ZeroClaw (Rust 进程)                          │
│                   AI Agent 核心引擎                               │
└──────────────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 桌面框架 | Electron | 28.2.2 | 跨平台桌面应用框架 |
| 前端框架 | React | 18.2.0 | UI 组件库 |
| 状态管理 | Zustand | 4.5.0 | 轻量级状态管理 |
| 样式方案 | TailwindCSS | 3.4.1 | CSS 框架 |
| 数据持久化 | electron-store | 8.1.0 | 本地存储 |
| 构建工具 | Vite | 5.1.2 | 构建工具 |
| 测试框架 | Vitest | 1.6.1 | 单元测试 |
| 类型系统 | TypeScript | 5.3.3 | 类型安全 |

## 📦 安装

### 系统要求

- macOS 10.15+ / Windows 10+ / Linux (x86_64)
- 至少 4GB RAM
- ZeroClaw 已安装并配置

### 下载安装

#### macOS

```bash
# 使用 Homebrew
brew install --cask zeroclaw-desktop

# 或下载 DMG
# 访问 https://github.com/weiransoft/zeroclaw-desktop/releases
```

#### Windows

```bash
# 使用 winget
winget install ZeroClaw.Desktop

# 或下载 MSI
# 访问 https://github.com/weiransoft/zeroclaw-desktop/releases
```

#### Linux

```bash
# 使用 AppImage
# 访问 https://github.com/weiransoft/zeroclaw-desktop/releases
```

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/weiransoft/zeroclaw-desktop.git
cd zeroclaw-desktop

# 安装依赖
npm install

# 构建应用
npm run build

# 运行应用
npm run electron:dev
```

## 🚀 使用

### 启动应用

```bash
# 开发模式
npm run electron:dev

# 生产模式
npm run electron:build
```

### 配对 Gateway

首次使用需要配对 ZeroClaw Gateway：

1. 启动 ZeroClaw Gateway
2. 在应用中点击配对按钮
3. 输入配对码或直接设置 Token

### 基本操作

#### 对话管理

- 创建新对话
- 切换会话
- 发送消息
- 查看历史记录

#### 智能体监控

- 查看任务列表
- 监控消息流
- 查看共识状态

#### 工作流管理

- 创建新工作流
- 启动/暂停工作流
- 查看工作流状态

## 🛠️ 开发

### 项目结构

```
zeroclaw-desktop/
├── electron/                    # Electron 主进程代码
│   ├── main.ts                  # 主进程入口
│   ├── preload.ts               # 预加载脚本
│   ├── core/                    # 核心功能
│   │   ├── ipc-handlers.ts      # IPC 处理器
│   │   └── zeroclaw-bridge.ts   # ZeroClaw 桥接
│   └── store/                   # 数据存储
│       └── database.ts          # 数据库
├── src/                         # 渲染进程代码
│   ├── components/              # React 组件
│   ├── hooks/                   # 自定义 Hooks
│   ├── stores/                  # 状态管理
│   ├── types/                   # 类型定义
│   └── styles/                  # 样式文件
├── __tests__/                   # 测试文件
├── docs/                        # 文档
└── scripts/                     # 脚本
```

### 开发命令

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 运行 Electron
npm run electron:dev

# 构建应用
npm run build

# 运行测试
npm test

# 运行测试（覆盖率）
npm run test:coverage

# 代码检查
npm run lint
```

### 代码规范

- TypeScript 严格模式
- ESLint + Prettier
- 测试覆盖率 > 80%

## 🤝 贡献

欢迎贡献！请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详细信息。

### 贡献方式

- 报告 Bug
- 提出新功能
- 提交代码
- 改进文档
- 分享反馈

### 开发流程

1. Fork 仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 🔒 安全

### 安全政策

请阅读 [SECURITY.md](./SECURITY.md) 了解我们的安全政策和漏洞报告流程。

### 安全特性

- ✅ 路径遍历防护
- ✅ 输入验证
- ✅ 内容安全策略 (CSP)
- ✅ Token 加密存储
- ✅ 最小权限原则

### 报告漏洞

发现安全问题？请邮件联系 security@zeroclaw.io 或通过 GitHub Security Reporting。

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](./LICENSE) 文件。

```
MIT License

Copyright (c) 2026 Weiransoft

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 致谢

- [ZeroClaw](https://github.com/weiransoft/zeroclaw) - AI Agent 核心引擎
- [Electron](https://www.electronjs.org/) - 桌面应用框架
- [React](https://react.dev/) - UI 库
- [Vite](https://vitejs.dev/) - 构建工具

## 📞 联系

- 问题反馈: https://github.com/weiransoft/zeroclaw-desktop/issues
- 讨论区: https://github.com/weiransoft/zeroclaw-desktop/discussions

---

<p align="center">
  <b>Happy Coding! 🚀</b>
</p>
