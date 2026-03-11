# ZeroClaw Desktop 配对问题修复指南

## 问题描述
ZeroClaw Desktop 发送消息后没有收到 Gateway 的回复。

## 根本原因
1. Gateway 配置了配对认证 (`require_pairing = true`)
2. Desktop 从未成功配对并保存有效的 Bearer token
3. Desktop 数据库中的 `gateway_token` 为空或无效

## 完整的 Desktop → Gateway 调用链路

```
用户发送消息
    ↓
Desktop: sendMessage()
    ↓
检查 Gateway 状态 → GET /health ✓
    ↓
检查配对状态 → isPaired && bearerToken
    ↓
发送 POST /chat/stream (带 Authorization: Bearer <token>)
    ↓
Gateway: handle_chat_stream()
    ↓
验证 Bearer token → pairing.is_authenticated(token)
    ↓
如果 token 有效 → 处理消息并返回 SSE 流式响应 ✓
如果 token 无效 → 返回 401 Unauthorized ✗
```

## 解决方案

### 方案 1: 直接设置 Token（推荐，已执行）

**步骤：**
1. 确认 Gateway 正在运行
2. 使用有效的 token 更新 Desktop 配置文件
3. 重启 Desktop 应用

**执行的命令：**
```bash
cd /Users/wangwei/claw/zeroclaw-desktop
node -e "
const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = path.join(os.homedir(), 'Library/Application Support/zeroclaw-desktop/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// 设置正确的 token
config.settings.gateway_token = 'zc_98f4dd3d9c884912h115799e2e4cab1a';
config.settings.gateway_token_encrypted = '';

fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
console.log('✓ Token 已更新');
"
```

**验证：**
```bash
# 检查 Desktop 配置
cat ~/Library/Application\ Support/zeroclaw-desktop/config.json | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('Token:', d.get('settings',{}).get('gateway_token'))"

# 测试 Gateway 响应
curl -X POST http://127.0.0.1:8080/chat/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer zc_98f4dd3d9c884912h115799e2e4cab1a" \
  -d '{"message":"测试"}'
```

### 方案 2: 通过 Desktop UI 重新配对

**步骤：**
1. 打开 ZeroClaw Desktop
2. 进入设置页面
3. 点击"配对"按钮
4. 查看 Gateway 启动日志获取配对码（6 位数字）
5. 输入配对码完成配对

**获取配对码：**
```bash
# 重启 Gateway 以获取新的配对码
cd /Users/wangwei/claw/zeroclaw
cargo run --bin zeroclaw -- gateway

# 查看终端输出中的配对码
# 🔐 PAIRING REQUIRED — use this one-time code:
#    ┌──────────────┐
#    │  123456  │
#    └──────────────┘
```

**使用配对码配对：**
```bash
# 使用配对码获取 token
curl -X POST http://127.0.0.1:8080/pair \
  -H "X-Pairing-Code: 123456"

# 返回示例：
# {"paired":true,"token":"zc_xxx","message":"Save this token..."}
```

### 方案 3: 清除配置中的 paired_tokens 重新配对

**适用场景：** 配置文件中的 token 失效或格式错误

**步骤：**
1. 编辑配置文件：`~/.zeroclaw/config.toml`
2. 修改 `paired_tokens = []` 为空数组
3. 重启 Gateway
4. Gateway 会生成新的配对码
5. 使用方案 2 进行配对

## 当前状态（已修复）

✅ **Gateway 状态：**
- 运行在：`http://127.0.0.1:8080`
- Provider: `aliyun` (阿里云百炼)
- Model: `qwen-plus`
- 配对状态：已配对
- 有效 Token: `zc_98f4dd3d9c884912h115799e2e4cab1a`

✅ **Desktop 配置：**
- Token 已设置：`zc_98f4dd3d9c884912h115799e2e4cab1a`
- 配置文件：`~/Library/Application Support/zeroclaw-desktop/config.json`

⚠️ **需要重启 Desktop：**
Electron 应用可能不会自动重新加载配置文件，需要重启 Desktop 才能使新的 token 生效。

## 测试验证

运行测试脚本：
```bash
/Users/wangwei/claw/zeroclaw-desktop/tests/scripts/test-desktop-message.sh
```

预期输出：
```
=== ZeroClaw Desktop 消息测试 ===

1. 检查 Gateway 状态...
   ✓ Gateway 运行正常

2. 检查配对状态...
   ✓ Gateway 已配对

3. 测试 Token 有效性...
   ✓ Token 有效

4. Gateway 响应:
   你好，测试已收到 ✅

5. 检查 Desktop 配置...
   ✓ Desktop Token 配置正确

=== 测试完成 ===
```

## 故障排查

### Desktop 仍然无法收到消息

1. **重启 Desktop 应用**
   ```bash
   # 停止 Desktop
   pkill -f "zeroclaw-desktop"
   
   # 重新启动
   cd /Users/wangwei/claw/zeroclaw-desktop
   npm run electron:dev
   ```

2. **检查 Desktop 日志**
   - 打开开发者工具（Cmd+Option+I）
   - 查看 Console 标签页
   - 查找 "ZeroClaw" 相关的日志

3. **验证 token 是否加载**
   - 在 Console 中运行：
   ```javascript
   // 检查 bridge 状态
   console.log(window.electronAPI.getPairingStatus?.())
   ```

### Gateway 返回 401 Unauthorized

1. **验证 token 格式**
   ```bash
   curl -X POST http://127.0.0.1:8080/chat/stream \
     -H "Authorization: Bearer zc_98f4dd3d9c884912h115799e2e4cab1a" \
     -d '{"message":"test"}'
   ```

2. **检查 Gateway 配置**
   ```bash
   grep -A 5 "\[gateway\]" ~/.zeroclaw/config.toml
   ```

3. **查看 Gateway 日志**
   - 停止当前 Gateway
   - 重新启动并查看详细日志

## 相关文件

- Desktop 配置：`~/Library/Application Support/zeroclaw-desktop/config.json`
- Gateway 配置：`~/.zeroclaw/config.toml`
- Bridge 代码：`/Users/wangwei/claw/zeroclaw-desktop/electron/core/zeroclaw-bridge.ts`
- IPC 处理器：`/Users/wangwei/claw/zeroclaw-desktop/electron/core/ipc-handlers.ts`
- Gateway 配对：`/Users/wangwei/claw/zeroclaw/src/security/pairing.rs`

## 修复日期
2026-03-11
