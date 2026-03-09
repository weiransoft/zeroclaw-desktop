#!/bin/bash

# GUI Agent 安全测试脚本
# 
# 本脚本用于运行 GUI Agent 的安全测试。
# 
# 使用方法:
#   ./test_security.sh
# 
# 示例:
#   ./test_security.sh

set -e

echo "========================================"
echo "GUI Agent 安全测试"
echo "========================================"

# 进入 zeroclaw 目录
cd "$(dirname "$0")/../../../zeroclaw"

# 运行安全测试
echo "运行 GUI Agent 安全测试..."
cargo test --package zeroclaw --test security gui_agent

echo "========================================"
echo "GUI Agent 安全测试完成"
echo "========================================"
