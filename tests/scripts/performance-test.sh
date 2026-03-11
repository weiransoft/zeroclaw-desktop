#!/bin/bash
# ZeroClaw Desktop 性能测试脚本

echo "=== ZeroClaw Desktop 性能测试 ==="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试 Gateway 响应时间
echo "1. 测试 Gateway 直接响应时间..."
echo "   发送消息：'性能测试，请回复 OK'"
echo ""

START_TIME=$(date +%s%N)
RESPONSE=$(curl -s -X POST http://127.0.0.1:8080/chat/stream \
  -H "Authorization: Bearer zc_98f4dd3d9c884912h115799e2e4cab1a" \
  -H "Content-Type: application/json" \
  -d '{"message":"性能测试，请回复 OK"}')
END_TIME=$(date +%s%N)

# 计算耗时（毫秒）
ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))

echo "   Gateway 响应时间：${ELAPSED_MS}ms"

if [ $ELAPSED_MS -lt 500 ]; then
    echo -e "   ${GREEN}✓ Gateway 响应正常 (<500ms)${NC}"
elif [ $ELAPSED_MS -lt 1000 ]; then
    echo -e "   ${YELLOW}⚠ Gateway 响应较慢 (${ELAPSED_MS}ms)${NC}"
else
    echo -e "   ${RED}✗ Gateway 响应过慢 (${ELAPSED_MS}ms)${NC}"
fi

echo ""
echo "   响应内容:"
echo "$RESPONSE" | grep -o '"text":"[^"]*"' | sed 's/"text":"//g' | sed 's/"//g' | tr -d '\n'
echo ""
echo ""

# 测试多次请求的平均时间
echo "2. 测试多次请求平均响应时间..."
echo "   发送 5 次测试消息..."
echo ""

TOTAL_TIME=0
COUNT=5

for i in $(seq 1 $COUNT); do
    START_TIME=$(date +%s%N)
    curl -s -X POST http://127.0.0.1:8080/chat/stream \
      -H "Authorization: Bearer zc_98f4dd3d9c884912h115799e2e4cab1a" \
      -H "Content-Type: application/json" \
      -d "{\"message\":\"测试 $i\"}" > /dev/null
    END_TIME=$(date +%s%N)
    
    ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))
    TOTAL_TIME=$((TOTAL_TIME + ELAPSED_MS))
    
    echo "   请求 $i: ${ELAPSED_MS}ms"
done

AVG_TIME=$((TOTAL_TIME / COUNT))
echo ""
echo "   平均响应时间：${AVG_TIME}ms"

if [ $AVG_TIME -lt 500 ]; then
    echo -e "   ${GREEN}✓ 平均响应时间优秀 (<500ms)${NC}"
elif [ $AVG_TIME -lt 1000 ]; then
    echo -e "   ${YELLOW}⚠ 平均响应时间可接受 (${AVG_TIME}ms)${NC}"
else
    echo -e "   ${RED}✗ 平均响应时间过慢 (${AVG_TIME}ms)${NC}"
fi

echo ""
echo "3. 检查 Desktop 性能日志..."
echo "   打开 Desktop 开发者工具查看性能日志："
echo "   1. 在 Desktop 中按 Cmd+Option+I"
echo "   2. 切换到 Console 标签"
echo "   3. 发送一条消息"
echo "   4. 查看 [PERF] 开头的日志"
echo ""
echo "   关键性能指标："
echo "   - streamChatRequest start: 请求开始"
echo "   - Gateway response started after: Gateway 开始响应的时间"
echo "   - Request completed: 总耗时，chunk 数量，字节数"
echo ""

echo "4. Desktop 性能优化建议..."
echo ""
echo "   已实施的优化："
echo "   ✓ 优化 checkGateway 逻辑 - 避免每次发送都检查 Gateway 状态"
echo "   ✓ 添加性能日志 - 便于诊断瓶颈"
echo ""
echo "   待实施的优化："
echo "   ⭐ 优化 SSE 解析 - 使用流式解析器替代字符串 split"
echo "   ⭐ 数据库异步化 - 批量写入消息，减少 I/O"
echo "   ⭐ 前端渲染优化 - 使用 requestAnimationFrame 批处理"
echo ""

echo "=== 测试完成 ==="
echo ""
echo "性能基准："
echo "  - 优秀：<500ms"
echo "  - 良好：500-1000ms"
echo "  - 需优化：>1000ms"
echo ""
echo "当前 Gateway 平均响应时间：${AVG_TIME}ms"
