#!/bin/bash

# GUI Agent 集成测试脚本
# 
# 本脚本用于运行 GUI Agent 的集成测试。
# 
# 使用方法:
#   ./test_integration.sh
# 
# 示例:
#   ./test_integration.sh

set -e

echo "========================================"
echo "GUI Agent 集成测试"
echo "========================================"

# 进入 zeroclaw 目录
cd "$(dirname "$0")/../../../zeroclaw"

# 运行集成测试
echo "运行 GUI Agent 集成测试..."
cargo test --package zeroclaw --test integration gui_agent

echo "========================================"
echo "GUI Agent 集成测试完成"
echo "========================================"
