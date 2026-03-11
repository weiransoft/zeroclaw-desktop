#!/bin/bash
# ZeroClaw Desktop 配对修复脚本
# 用于解决 desktop 发送消息无回复的问题

set -e

echo "=== ZeroClaw Desktop 配对修复脚本 ==="
echo ""

# 1. 检查 gateway 是否运行
echo "1. 检查 Gateway 状态..."
if curl -s http://127.0.0.1:8080/health > /dev/null 2>&1; then
    echo "   ✓ Gateway 正在运行"
else
    echo "   ✗ Gateway 未运行，请先启动 Gateway"
    exit 1
fi

# 2. 检查配对状态
echo ""
echo "2. 检查配对状态..."
HEALTH_RESPONSE=$(curl -s http://127.0.0.1:8080/health)
PAIRED=$(echo "$HEALTH_RESPONSE" | grep -o '"paired":true' || true)

if [ -n "$PAIRED" ]; then
    echo "   ✓ Gateway 已配对"
else
    echo "   ✗ Gateway 未配对"
    echo "   提示：需要重启 Gateway 获取配对码"
fi

# 3. 测试 /chat/stream 端点
echo ""
echo "3. 测试 /chat/stream 端点..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:8080/chat/stream \
    -H "Content-Type: application/json" \
    -d '{"message":"测试"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ]; then
    echo "   ✗ 返回 401 Unauthorized - 需要有效的 Bearer token"
    echo ""
    echo "=== 解决方案 ==="
    echo ""
    echo "方案 1: 通过 Desktop UI 重新配对"
    echo "  1. 打开 ZeroClaw Desktop"
    echo "  2. 进入设置页面"
    echo "  3. 点击'配对'按钮"
    echo "  4. 输入配对码（需要查看 Gateway 启动日志）"
    echo ""
    echo "方案 2: 手动获取配对码并配对"
    echo "  1. 重启 Gateway 获取配对码："
    echo "     cd /Users/wangwei/claw/zeroclaw"
    echo "     ZEROCLAW_WORKSPACE=test_workspace ZEROCLAW_PROVIDER=aliyun ZEROCLAW_MODEL=qwen-plus ALIYUN_API_KEY=sk-cbbe9247998243259cf10cf182032ffe cargo run --bin zeroclaw -- gateway"
    echo ""
    echo "  2. 查看终端输出的配对码（6 位数字）"
    echo ""
    echo "  3. 使用配对码配对："
    echo "     curl -X POST http://127.0.0.1:8080/pair -H 'X-Pairing-Code: <配对码>'"
    echo ""
    echo "  4. 保存返回的 token，在 Desktop 中设置"
    echo ""
    echo "方案 3: 清除配置中的 paired_tokens 重新配对"
    echo "  编辑 ~/.zeroclaw/config.toml"
    echo "  将 paired_tokens = [...] 修改为 paired_tokens = []"
    echo "  然后重启 Gateway"
    echo ""
elif [ "$HTTP_CODE" = "200" ]; then
    echo "   ✓ 端点工作正常"
else
    echo "   ? 返回状态码：$HTTP_CODE"
    echo "   响应：$BODY"
fi

echo ""
echo "=== 诊断完成 ==="
