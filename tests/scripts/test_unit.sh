#!/bin/bash

# GUI Agent 单元测试脚本
# 
# 本脚本用于运行 GUI Agent 的单元测试。
# 
# 使用方法:
#   ./test_unit.sh [module]
# 
# 参数:
#   module - 可选,指定要测试的模块
# 
# 示例:
#   ./test_unit.sh                    # 运行所有测试
#   ./test_unit.sh screen             # 运行 screen 模块测试
#   ./test_unit.sh automation         # 运行 automation 模块测试

set -e

echo "========================================"
echo "GUI Agent 单元测试"
echo "========================================"

# 进入 zeroclaw 目录
cd "$(dirname "$0")/../../../zeroclaw"

# 运行测试
if [ -z "$1" ]; then
    echo "运行所有 GUI Agent 单元测试..."
    cargo test --package zeroclaw --lib gui:: -- --nocapture
else
    echo "运行 $1 模块测试..."
    case "$1" in
        screen)
            cargo test --package zeroclaw --lib gui::screen:: -- --nocapture
            ;;
        automation)
            cargo test --package zeroclaw --lib gui::automation:: -- --nocapture
            ;;
        gateway)
            cargo test --package zeroclaw --lib gui::gateway:: -- --nocapture
            ;;
        integration)
            cargo test --package zeroclaw --lib gui::integration:: -- --nocapture
            ;;
        *)
            echo "未知模块: $1"
            echo "可用模块: screen, automation, gateway, integration"
            exit 1
            ;;
    esac
fi

echo "========================================"
echo "GUI Agent 单元测试完成"
echo "========================================"
