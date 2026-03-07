# 贡献指南

感谢您对 ZeroClaw Desktop 项目的关注！我们欢迎各种形式的贡献，包括代码、文档、测试、反馈等。

## 📋 目录

- [贡献指南](#贡献指南)
- [📋 目录](#-目录)
- [💬 社区](#-社区)
- [🐛 报告 Bug](#-报告-bug)
- [✨ 提出新功能](#-提出新功能)
- [🚀 开发准备](#-开发准备)
- [📝 开发流程](#-开发流程)
- [🧪 测试](#-测试)
- [📚 文档](#-文档)
- [⬆️ 提交代码](#️-提交代码)
- [❓ 常见问题](#-常见问题)

## 💬 社区

在开始贡献之前，请先加入我们的社区：

- **GitHub Issues**: 报告问题和功能请求
- **GitHub Discussions**: 讨论想法和问题


## 🐛 报告 Bug

报告 Bug 时，请提供以下信息：

1. **标题**: 简明扼要的描述
2. **环境**:
   - 操作系统和版本
   - ZeroClaw Desktop 版本
   - Node.js 版本
3. **重现步骤**:
   - 详细的操作步骤
   - 预期结果
   - 实际结果
4. **截图/日志**: 如果适用
5. **额外信息**: 任何相关的信息

## ✨ 提出新功能

提出新功能时，请提供：

1. **功能描述**: 详细描述功能
2. **使用场景**: 为什么需要这个功能
3. **实现建议**: 如果有想法，可以提供实现方案
4. **影响范围**: 可能影响的模块

## 🚀 开发准备

### 环境要求

- Node.js 18+ (推荐使用 LTS 版本)
- npm 9+
- Git
- ZeroClaw 已安装

### 克隆仓库

```bash
git clone https://github.com/weiransoft/zeroclaw-desktop.git
cd zeroclaw-desktop
```

### 安装依赖

```bash
npm install
```

### 验证安装

```bash
# 运行测试
npm test

# 代码检查
npm run lint
```

## 📝 开发流程

### 1. Fork 仓库

点击仓库右上角的 "Fork" 按钮。

### 2. 创建分支

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix-name
```

### 3. 开发

遵循我们的代码规范：

- TypeScript 严格模式
- ESLint + Prettier
- 添加必要的测试
- 更新相关文档

### 4. 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --run src/__tests__/your-test.spec.ts

# 代码检查
npm run lint

# 代码格式化
npm run format
```

### 5. 提交更改

```bash
git add .
git commit -m "feat: add amazing feature"
```

提交信息格式：

```
<type>: <description>

[可选] 详细描述
```

Type 类型：

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动

## 🧪 测试

### 单元测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- --run src/__tests__/stores/chatStore.test.ts

# 生成覆盖率报告
npm run test:coverage
```

### E2E 测试

```bash
# 运行 E2E 测试
npm run test:e2e

# 运行 E2E 测试（ headed 模式）
npm run test:e2e:headed
```

### 测试覆盖率

我们要求测试覆盖率 > 80%：

```bash
# 查看覆盖率报告
open coverage/index.html
```

## 📚 文档

### 更新文档

修改文档时：

1. 更新相关注释
2. 更新 README.md（如果需要）
3. 更新 API 文档
4. 添加示例代码

### 文档风格

- 使用中文或英文
- 代码注释使用中文或英文
- 文档保持简洁明了

## ⬆️ 提交代码

### 1. 推送到您的 Fork

```bash
git push origin feature/your-feature-name
```

### 2. 创建 Pull Request

1. 访问 GitHub
2. 点击 "Compare & pull request"
3. 填写 PR 模板
4. 提交

### 3. PR 模板

```
## 描述
[简要描述 PR 的内容]

## 相关 Issue
[相关 Issue 编号]

## 类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 文档更新
- [ ] 代码重构
- [ ] 测试

## 检查
- [ ] 代码已测试
- [ ] 文档已更新
- [ ] 代码符合规范
- [ ] 无编译错误
```

### 4. Code Review

- 一位维护者将审查您的代码
- 可能会提出修改建议
- 通过后将合并到主分支

## ❓ 常见问题

### Q: 如何运行开发服务器？

```bash
npm run electron:dev
```

### Q: 如何构建应用？

```bash
npm run build
```

### Q: 如何运行测试？

```bash
npm test
```

### Q: 如何格式化代码？

```bash
npm run format
```

### Q: 如何检查代码？

```bash
npm run lint
```

## 🎉 感谢

感谢您的贡献！我们非常重视每一位贡献者。

---

<p align="center">
  <b>Happy Coding! 🚀</b>
</p>
