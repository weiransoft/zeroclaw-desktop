#!/bin/bash
# ZeroClaw Desktop 连接测试

echo "=== ZeroClaw Desktop 连接诊断 ==="
echo ""

# 1. 检查 Gateway
echo "1. 检查 Gateway 状态..."
HEALTH=$(curl -s http://127.0.0.1:8080/health)
if [ $? -eq 0 ]; then
    echo "   ✓ Gateway 正在运行"
    echo "   响应：$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print('   状态:', d.get('status'), '| 配对:', d.get('paired'))"
else
    echo "   ✗ Gateway 未运行"
    exit 1
fi

# 2. 测试带 Token 的请求
echo ""
echo "2. 测试 Gateway 认证..."
TOKEN="zc_98f4dd3d9c884912h115799e2e4cab1a"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:8080/chat/stream \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"测试"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✓ Token 有效，Gateway 认证通过"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "   ✗ Token 无效，认证失败"
    echo "   提示：需要重新配对获取新 token"
else
    echo "   ? 返回状态码：$HTTP_CODE"
fi

# 3. 检查 Desktop 配置
echo ""
echo "3. 检查 Desktop 配置..."
CONFIG_FILE="$HOME/Library/Application Support/zeroclaw-desktop/config.json"
if [ -f "$CONFIG_FILE" ]; then
    DESKTOP_TOKEN=$(cat "$CONFIG_FILE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('settings',{}).get('gateway_token',''))" 2>/dev/null)
    if [ "$DESKTOP_TOKEN" = "$TOKEN" ]; then
        echo "   ✓ Desktop Token 配置正确"
    else
        echo "   ✗ Desktop Token 配置不匹配"
        echo "      期望：$TOKEN"
        echo "      实际：$DESKTOP_TOKEN"
    fi
else
    echo "   ✗ Desktop 配置文件不存在"
fi

# 4. 检查 Desktop 进程
echo ""
echo "4. 检查 Desktop 进程..."
if ps aux | grep -i "electron.*zeroclaw" | grep -v grep > /dev/null; then
    echo "   ✓ Desktop 正在运行"
    ps aux | grep -i "electron.*zeroclaw" | grep -v grep | awk '{print "   PID:", $2}'
else
    echo "   ✗ Desktop 未运行"
fi

# 5. 测试直接连接
echo ""
echo "5. 测试从 Desktop 到 Gateway 的连接..."
echo "   请在 Desktop 开发者工具 Console 中运行以下命令："
echo ""
echo "   // 测试 Gateway 连接"
echo "   fetch('http://127.0.0.1:8080/health')"
echo "     .then(r => r.json())"
echo "     .then(d => console.log('Gateway:', d))"
echo "     .catch(e => console.error('连接失败:', e))"
echo ""
echo "   // 测试带认证的请求"
echo "   fetch('http://127.0.0.1:8080/chat/stream', {"
echo "     method: 'POST',"
echo "     headers: {"
echo "       'Authorization': 'Bearer $TOKEN',"
echo "       'Content-Type': 'application/json'"
echo "     },"
echo "     body: JSON.stringify({message: '测试'})"
echo "   })"
echo "   .then(r => console.log('响应状态:', r.status))"
echo "   .catch(e => console.error('请求失败:', e))"
echo ""

echo "=== 诊断完成 ==="
echo ""
echo "如果所有检查都通过，但 Desktop 仍无法发送消息："
echo "  1. 重启 Desktop 应用（Cmd+Q 完全退出，然后重新打开）"
echo "  2. 查看 Desktop 开发者工具 Console 中的日志"
echo "  3. 查找 'ZeroClaw' 相关的错误信息"
