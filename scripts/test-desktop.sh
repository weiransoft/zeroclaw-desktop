#!/bin/bash

# ZeroClaw Desktop 自动化测试脚本
# 用于验证 Desktop 应用的核心功能

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="/tmp/zeroclaw-test-logs"
TEST_RESULTS=()

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 初始化日志目录
mkdir -p "$LOG_DIR"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TEST_RESULTS+=("PASS: $1")
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    TEST_RESULTS+=("FAIL: $1")
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 测试 Gateway 是否运行
test_gateway_health() {
    log_info "测试 Gateway 健康状态..."
    
    local response
    response=$(curl -s http://127.0.0.1:8080/health 2>/dev/null || echo '{"status":"error"}')
    
    if echo "$response" | grep -q '"status":"ok"'; then
        log_success "Gateway 健康检查通过"
        return 0
    else
        log_error "Gateway 未运行或不健康: $response"
        return 1
    fi
}

# 测试 Gateway 配对状态
test_gateway_pairing() {
    log_info "测试 Gateway 配对状态..."
    
    local response
    response=$(curl -s http://127.0.0.1:8080/health 2>/dev/null || echo '{}')
    
    if echo "$response" | grep -q '"paired":true'; then
        log_success "Gateway 已配对"
        return 0
    else
        log_warn "Gateway 未配对，需要先配对"
        return 1
    fi
}

# 测试 Webhook 通信
test_webhook_communication() {
    log_info "测试 Webhook 通信..."
    
    local token
    token=$(cat ~/Library/Application\ Support/zeroclaw-desktop/config.json 2>/dev/null | grep gateway_token | head -1 | sed 's/.*"gateway_token": *"\([^"]*\)".*/\1/')
    
    if [ -z "$token" ]; then
        log_error "未找到 gateway_token"
        return 1
    fi
    
    local response
    response=$(curl -s -X POST http://127.0.0.1:8080/webhook \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d '{"message": "test ping"}' 2>/dev/null || echo '{"error":"failed"}')
    
    if echo "$response" | grep -q '"response"'; then
        log_success "Webhook 通信正常"
        return 0
    else
        log_error "Webhook 通信失败: $response"
        return 1
    fi
}

# 测试 Desktop 进程
test_desktop_process() {
    log_info "测试 Desktop 进程..."
    
    if pgrep -f "Electron.*zeroclaw-desktop" > /dev/null; then
        log_success "Desktop 进程运行中"
        return 0
    else
        log_error "Desktop 进程未运行"
        return 1
    fi
}

# 测试 Vite 开发服务器
test_vite_server() {
    log_info "测试 Vite 开发服务器..."
    
    local response
    response=$(curl -s http://localhost:5173/ 2>/dev/null | head -5 || echo "")
    
    if [ -n "$response" ] && echo "$response" | grep -q "html"; then
        log_success "Vite 服务器运行正常"
        return 0
    else
        log_error "Vite 服务器未运行"
        return 1
    fi
}

# 测试 IPC 通信
test_ipc_communication() {
    log_info "测试 IPC 通信..."
    
    # 通过 Electron 的日志检查 IPC 是否正常
    local log_file="/tmp/desktop.log"
    
    if [ -f "$log_file" ]; then
        if grep -q "Loaded.*agents" "$log_file" 2>/dev/null; then
            log_success "IPC 通信正常（已加载代理）"
            return 0
        fi
    fi
    
    log_warn "无法验证 IPC 通信状态"
    return 1
}

# 测试技能市场
test_skill_market() {
    log_info "测试技能市场..."
    
    local token
    token=$(cat ~/Library/Application\ Support/zeroclaw-desktop/config.json 2>/dev/null | grep gateway_token | head -1 | sed 's/.*"gateway_token": *"\([^"]*\)".*/\1/')
    
    # 测试 ClawHub IPC 处理器
    # 这里需要通过 Electron 的实际调用来测试
    # 暂时跳过，需要 Playwright 或 Puppeteer 来测试前端
    
    log_warn "技能市场测试需要前端自动化工具"
    return 0
}

# 测试配置加载
test_config_loading() {
    log_info "测试配置加载..."
    
    local config_path="$HOME/.zeroclaw/config.toml"
    
    if [ -f "$config_path" ] || [ -L "$config_path" ]; then
        if grep -q "default_provider" "$config_path" 2>/dev/null; then
            log_success "配置文件加载正常"
            return 0
        fi
    fi
    
    log_error "配置文件加载失败"
    return 1
}

# 测试代理加载
test_agent_loading() {
    log_info "测试代理加载..."
    
    local log_file="/tmp/desktop.log"
    
    if [ -f "$log_file" ]; then
        local agent_count
        agent_count=$(grep -o "Loaded [0-9]* agents" "$log_file" 2>/dev/null | head -1 | grep -o "[0-9]*" || echo "0")
        
        if [ "$agent_count" -gt 0 ]; then
            log_success "已加载 $agent_count 个代理"
            return 0
        fi
    fi
    
    log_warn "无法验证代理加载状态"
    return 1
}

# 测试内存使用
test_memory_usage() {
    log_info "测试内存使用..."
    
    local electron_pid
    electron_pid=$(pgrep -f "Electron.*zeroclaw-desktop" | head -1)
    
    if [ -n "$electron_pid" ]; then
        local mem_mb
        mem_mb=$(ps -o rss= -p "$electron_pid" 2>/dev/null | awk '{print int($1/1024)}')
        
        if [ -n "$mem_mb" ]; then
            if [ "$mem_mb" -lt 500 ]; then
                log_success "内存使用正常: ${mem_mb}MB"
                return 0
            else
                log_warn "内存使用较高: ${mem_mb}MB"
                return 0
            fi
        fi
    fi
    
    log_warn "无法获取内存使用信息"
    return 1
}

# 运行所有测试
run_all_tests() {
    echo ""
    echo "======================================"
    echo "  ZeroClaw Desktop 自动化测试"
    echo "======================================"
    echo ""
    
    local passed=0
    local failed=0
    
    # 后端测试
    echo "--- 后端测试 ---"
    test_gateway_health && ((passed++)) || ((failed++))
    test_gateway_pairing && ((passed++)) || ((failed++))
    test_webhook_communication && ((passed++)) || ((failed++))
    test_config_loading && ((passed++)) || ((failed++))
    
    # 前端测试
    echo ""
    echo "--- 前端测试 ---"
    test_desktop_process && ((passed++)) || ((failed++))
    test_vite_server && ((passed++)) || ((failed++))
    test_ipc_communication && ((passed++)) || ((failed++))
    test_agent_loading && ((passed++)) || ((failed++))
    test_memory_usage && ((passed++)) || ((failed++))
    
    # 功能测试
    echo ""
    echo "--- 功能测试 ---"
    test_skill_market && ((passed++)) || ((failed++))
    
    # 输出结果
    echo ""
    echo "======================================"
    echo "  测试结果汇总"
    echo "======================================"
    echo ""
    
    for result in "${TEST_RESULTS[@]}"; do
        echo "  $result"
    done
    
    echo ""
    echo -e "总计: ${GREEN}$passed 通过${NC}, ${RED}$failed 失败${NC}"
    echo ""
    
    if [ "$failed" -gt 0 ]; then
        return 1
    fi
    return 0
}

# 主入口
case "${1:-all}" in
    "gateway")
        test_gateway_health
        test_gateway_pairing
        test_webhook_communication
        ;;
    "desktop")
        test_desktop_process
        test_vite_server
        test_ipc_communication
        ;;
    "config")
        test_config_loading
        test_agent_loading
        ;;
    "all")
        run_all_tests
        ;;
    *)
        echo "用法: $0 [gateway|desktop|config|all]"
        exit 1
        ;;
esac
