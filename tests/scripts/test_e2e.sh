#!/bin/bash

# GUI Agent E2E 测试脚本
# 
# 本脚本用于运行 GUI Agent 的端到端测试。
# 
# 使用方法:
#   ./test_e2e.sh
# 
# 示例:
#   ./test_e2e.sh

set -e

echo "========================================"
echo "GUI Agent E2E 测试"
echo "========================================"

# 进入 zeroclaw-desktop 目录
cd "$(dirname "$0")/../../../zeroclaw-desktop"

# 运行 E2E 测试
echo "运行 GUI Agent E2E 测试..."
npm run test:e2e

echo "========================================"
echo "GUI Agent E2E 测试完成"
echo "========================================"
