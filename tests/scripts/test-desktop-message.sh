#!/bin/bash
# ZeroClaw Desktop 消息发送测试脚本

echo "=== ZeroClaw Desktop 消息测试 ==="
echo ""

# 1. 检查 Gateway 状态
echo "1. 检查 Gateway 状态..."
HEALTH=$(curl -s http://127.0.0.1:8080/health | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if d.get('status')=='ok' else 'ERROR')")
if [ "$HEALTH" = "OK" ]; then
    echo "   ✓ Gateway 运行正常"
else
    echo "   ✗ Gateway 异常"
    exit 1
fi

# 2. 检查配对状态
echo ""
echo "2. 检查配对状态..."
PAIRED=$(curl -s http://127.0.0.1:8080/health | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('paired') else 'false')")
if [ "$PAIRED" = "true" ]; then
    echo "   ✓ Gateway 已配对"
else
    echo "   ✗ Gateway 未配对"
fi

# 3. 测试 Token 有效性
echo ""
echo "3. 测试 Token 有效性..."
TOKEN="zc_98f4dd3d9c884912h115799e2e4cab1a"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:8080/chat/stream \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"message":"测试消息，请回复 OK"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✓ Token 有效"
    echo ""
    echo "4. Gateway 响应:"
    echo "$BODY" | grep -o '"text":"[^"]*"' | sed 's/"text":"//g' | sed 's/"//g' | tr -d '\n'
    echo ""
else
    echo "   ✗ Token 无效 (HTTP $HTTP_CODE)"
    echo "   响应：$BODY"
    exit 1
fi

# 5. 检查 Desktop 配置
echo ""
echo "5. 检查 Desktop 配置..."
CONFIG_FILE="$HOME/Library/Application Support/zeroclaw-desktop/config.json"
if [ -f "$CONFIG_FILE" ]; then
    DESKTOP_TOKEN=$(cat "$CONFIG_FILE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('settings',{}).get('gateway_token',''))" 2>/dev/null)
    if [ "$DESKTOP_TOKEN" = "$TOKEN" ]; then
        echo "   ✓ Desktop Token 配置正确"
    else
        echo "   ✗ Desktop Token 配置错误或不一致"
        echo "      期望：$TOKEN"
        echo "      实际：$DESKTOP_TOKEN"
    fi
else
    echo "   ✗ Desktop 配置文件不存在"
fi

echo ""
echo "=== 测试完成 ==="
echo ""
echo "提示：如果所有测试通过，但 Desktop 仍无法收到消息，请："
echo "  1. 重启 Desktop 应用以重新加载配置"
echo "  2. 检查 Desktop 控制台日志"
echo "  3. 查看渲染进程中的网络请求"
