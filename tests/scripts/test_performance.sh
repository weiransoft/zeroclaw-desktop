#!/bin/bash

# GUI Agent 性能测试脚本
# 
# 本脚本用于运行 GUI Agent 的性能测试。
# 
# 使用方法:
#   ./test_performance.sh [test_type]
# 
# 参数:
#   test_type - 可选,指定要测试的类型
# 
# 示例:
#   ./test_performance.sh              # 运行所有性能测试
#   ./test_performance.sh capture      # 运行屏幕捕获性能测试
#   ./test_performance.sh automation   # 运行自动化操作性能测试

set -e

echo "========================================"
echo "GUI Agent 性能测试"
echo "========================================"

# 进入 zeroclaw 目录
cd "$(dirname "$0")/../../../zeroclaw"

# 运行性能测试
if [ -z "$1" ]; then
    echo "运行所有 GUI Agent 性能测试..."
    cargo test --package zeroclaw --test performance -- --nocapture
else
    echo "运行 $1 性能测试..."
    case "$1" in
        capture)
            cargo test --package zeroclaw --test performance screen_capture -- --nocapture
            ;;
        automation)
            cargo test --package zeroclaw --test performance automation -- --nocapture
            ;;
        *)
            echo "未知测试类型: $1"
            echo "可用测试类型: capture, automation"
            exit 1
            ;;
    esac
fi

echo "========================================"
echo "GUI Agent 性能测试完成"
echo "========================================"
