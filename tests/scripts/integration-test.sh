#!/bin/bash

# ZeroClaw Desktop 全流程集成测试脚本
# 测试对话、工作流、智能体群组等功能

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
TEST_LOG="$PROJECT_DIR/tests/logs/integration-test-$(date +%Y%m%d_%H%M%S).log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1" | tee -a "$TEST_LOG"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1" | tee -a "$TEST_LOG"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1" | tee -a "$TEST_LOG"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$TEST_LOG"
}

# 创建日志目录
mkdir -p "$PROJECT_DIR/tests/logs"

log "=========================================="
log "ZeroClaw Desktop 集成测试"
log "=========================================="
log "测试时间: $(date)"
log "项目目录: $PROJECT_DIR"
log ""

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    local test_name="$1"
    local test_func="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log "运行测试: $test_name"
    
    if $test_func; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log_success "$test_name"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log_error "$test_name"
    fi
    echo ""
}

# ==========================================
# 测试函数定义
# ==========================================

test_project_structure() {
    log "检查项目结构..."
    
    local required_dirs=(
        "electron"
        "electron/core"
        "electron/store"
        "src"
        "src/components"
        "src/components/chat"
        "src/components/swarm"
        "src/components/workflow"
        "src/hooks"
        "src/stores"
        "src/types"
    )
    
    local all_exist=true
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$PROJECT_DIR/$dir" ]; then
            log_error "目录不存在: $dir"
            all_exist=false
        fi
    done
    
    $all_exist
}

test_electron_main() {
    log "检查 Electron 主进程文件..."
    
    local main_file="$PROJECT_DIR/electron/main.ts"
    local preload_file="$PROJECT_DIR/electron/preload.ts"
    local ipc_file="$PROJECT_DIR/electron/core/ipc-handlers.ts"
    local bridge_file="$PROJECT_DIR/electron/core/zeroclaw-bridge.ts"
    local db_file="$PROJECT_DIR/electron/store/database.ts"
    
    [ -f "$main_file" ] && [ -f "$preload_file" ] && [ -f "$ipc_file" ] && [ -f "$bridge_file" ] && [ -f "$db_file" ]
}

test_react_components() {
    log "检查 React 组件..."
    
    local components=(
        "src/components/chat/ChatView.tsx"
        "src/components/chat/SessionList.tsx"
        "src/components/chat/MessageList.tsx"
        "src/components/chat/InputBar.tsx"
        "src/components/swarm/SwarmView.tsx"
        "src/components/swarm/TaskList.tsx"
        "src/components/workflow/WorkflowView.tsx"
        "src/components/workflow/WorkflowList.tsx"
        "src/components/settings/SettingsView.tsx"
    )
    
    local all_exist=true
    for comp in "${components[@]}"; do
        if [ ! -f "$PROJECT_DIR/$comp" ]; then
            log_error "组件不存在: $comp"
            all_exist=false
        fi
    done
    
    $all_exist
}

test_zustand_stores() {
    log "检查 Zustand Stores..."
    
    local stores=(
        "src/stores/chatStore.ts"
        "src/stores/swarmStore.ts"
        "src/stores/workflowStore.ts"
        "src/stores/settingsStore.ts"
    )
    
    local all_exist=true
    for store in "${stores[@]}"; do
        if [ ! -f "$PROJECT_DIR/$store" ]; then
            log_error "Store 不存在: $store"
            all_exist=false
        fi
    done
    
    $all_exist
}

test_custom_hooks() {
    log "检查自定义 Hooks..."
    
    local hooks=(
        "src/hooks/useChat.ts"
        "src/hooks/useSwarm.ts"
        "src/hooks/useWorkflow.ts"
    )
    
    local all_exist=true
    for hook in "${hooks[@]}"; do
        if [ ! -f "$PROJECT_DIR/$hook" ]; then
            log_error "Hook 不存在: $hook"
            all_exist=false
        fi
    done
    
    $all_exist
}

test_typescript_config() {
    log "检查 TypeScript 配置..."
    
    [ -f "$PROJECT_DIR/tsconfig.json" ] && [ -f "$PROJECT_DIR/tsconfig.node.json" ]
}

test_vite_config() {
    log "检查 Vite 配置..."
    
    [ -f "$PROJECT_DIR/vite.config.ts" ]
}

test_package_json() {
    log "检查 package.json..."
    
    local pkg_file="$PROJECT_DIR/package.json"
    
    if [ ! -f "$pkg_file" ]; then
        return 1
    fi
    
    # 检查必要依赖
    local deps_ok=true
    
    grep -q '"electron"' "$pkg_file" || deps_ok=false
    grep -q '"react"' "$pkg_file" || deps_ok=false
    grep -q '"zustand"' "$pkg_file" || deps_ok=false
    grep -q '"smol-toml"' "$pkg_file" || deps_ok=false
    
    $deps_ok
}

test_zeroclaw_config_loader() {
    log "检查 ZeroClaw 配置加载器..."
    
    local config_loader="$PROJECT_DIR/electron/core/config-loader.ts"
    
    if [ ! -f "$config_loader" ]; then
        log_error "配置加载器不存在"
        return 1
    fi
    
    # 检查关键函数
    grep -q "loadZeroClawConfig" "$config_loader" && \
    grep -q "findConfigFile" "$config_loader" && \
    grep -q "getConfigSummary" "$config_loader"
}

test_zeroclaw_binary() {
    log "检查 ZeroClaw 二进制文件..."
    
    local possible_paths=(
        "$HOME/claw/zeroclaw/target/release/zeroclaw"
        "$HOME/claw/zeroclaw/target/debug/zeroclaw"
        "/usr/local/bin/zeroclaw"
        "$HOME/.cargo/bin/zeroclaw"
    )
    
    for path in "${possible_paths[@]}"; do
        if [ -f "$path" ]; then
            log "找到 ZeroClaw: $path"
            return 0
        fi
    done
    
    log_warn "未找到 ZeroClaw 二进制文件，某些功能可能不可用"
    return 0  # 不作为失败条件
}

test_zeroclaw_config() {
    log "检查 ZeroClaw 配置文件..."
    
    local config_paths=(
        "$HOME/claw/zeroclaw/config.toml"
        "$HOME/.zeroclaw/config.toml"
        "$HOME/.config/zeroclaw/config.toml"
    )
    
    for path in "${config_paths[@]}"; do
        if [ -f "$path" ]; then
            log "找到配置文件: $path"
            
            # 检查关键配置项
            if grep -q "api_key" "$path" && grep -q "default_provider" "$path"; then
                return 0
            else
                log_warn "配置文件缺少必要配置项"
                return 1
            fi
        fi
    done
    
    log_warn "未找到 ZeroClaw 配置文件"
    return 0  # 不作为失败条件
}

test_build_main() {
    log "测试主进程构建..."
    
    cd "$PROJECT_DIR"
    npm run build:main > /dev/null 2>&1
    local result=$?
    
    cd - > /dev/null
    return $result
}

test_unit_tests() {
    log "运行单元测试..."
    
    cd "$PROJECT_DIR"
    npm test > /dev/null 2>&1
    local result=$?
    
    cd - > /dev/null
    return $result
}

test_ipc_api_coverage() {
    log "检查 IPC API 覆盖率..."
    
    local ipc_file="$PROJECT_DIR/electron/core/ipc-handlers.ts"
    local preload_file="$PROJECT_DIR/electron/preload.ts"
    
    # 检查关键 API
    local apis=(
        "chat:send"
        "chat:sessions"
        "swarm:list"
        "swarm:messages"
        "workflow:list"
        "workflow:create"
        "workflow:start"
        "system:status"
        "zeroclaw:config"
    )
    
    local all_found=true
    for api in "${apis[@]}"; do
        if ! grep -q "$api" "$ipc_file"; then
            log_error "IPC API 缺失: $api"
            all_found=false
        fi
    done
    
    $all_found
}

test_workspace_directory() {
    log "检查工作空间目录..."
    
    local workspace="$HOME/claw"
    
    if [ -d "$workspace" ]; then
        log "工作空间存在: $workspace"
        return 0
    else
        log_warn "工作空间不存在: $workspace，将自动创建"
        mkdir -p "$workspace"
        return 0
    fi
}

test_documentation() {
    log "检查文档..."
    
    local docs=(
        "docs/architecture.md"
        "docs/api-design.md"
        "docs/components.md"
        "docs/data-flow.md"
    )
    
    local all_exist=true
    for doc in "${docs[@]}"; do
        if [ ! -f "$PROJECT_DIR/$doc" ]; then
            log_error "文档不存在: $doc"
            all_exist=false
        fi
    done
    
    $all_exist
}

# ==========================================
# 运行所有测试
# ==========================================

log "开始运行测试..."
log ""

# 基础结构测试
run_test "项目结构检查" test_project_structure
run_test "Electron 主进程文件检查" test_electron_main
run_test "React 组件检查" test_react_components
run_test "Zustand Stores 检查" test_zustand_stores
run_test "自定义 Hooks 检查" test_custom_hooks

# 配置测试
run_test "TypeScript 配置检查" test_typescript_config
run_test "Vite 配置检查" test_vite_config
run_test "package.json 检查" test_package_json

# ZeroClaw 集成测试
run_test "ZeroClaw 配置加载器检查" test_zeroclaw_config_loader
run_test "ZeroClaw 二进制文件检查" test_zeroclaw_binary
run_test "ZeroClaw 配置文件检查" test_zeroclaw_config
run_test "工作空间目录检查" test_workspace_directory

# 构建和测试
run_test "主进程构建测试" test_build_main
run_test "单元测试" test_unit_tests

# API 覆盖率测试
run_test "IPC API 覆盖率检查" test_ipc_api_coverage

# 文档测试
run_test "文档检查" test_documentation

# ==========================================
# 输出测试结果
# ==========================================

log "=========================================="
log "测试结果汇总"
log "=========================================="
log "总测试数: $TOTAL_TESTS"
log_success "通过: $PASSED_TESTS"
log_error "失败: $FAILED_TESTS"
log ""
log "日志文件: $TEST_LOG"

if [ $FAILED_TESTS -eq 0 ]; then
    log_success "所有测试通过!"
    exit 0
else
    log_error "有 $FAILED_TESTS 个测试失败"
    exit 1
fi
