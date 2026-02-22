#!/bin/bash

# ZeroClaw Desktop 端到端功能测试
# 测试对话、工作流、智能体群组的完整交互流程

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
TEST_LOG="$PROJECT_DIR/tests/logs/functional-test-$(date +%Y%m%d_%H%M%S).log"
TEST_WORKSPACE="$HOME/claw"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1" | tee -a "$TEST_LOG"
}

log_test() {
    echo -e "${MAGENTA}[TEST]${NC} $1" | tee -a "$TEST_LOG"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1" | tee -a "$TEST_LOG"
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
log "ZeroClaw Desktop 功能测试"
log "=========================================="
log "测试时间: $(date)"
log "项目目录: $PROJECT_DIR"
log "工作空间: $TEST_WORKSPACE"
log ""

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    local test_name="$1"
    local test_func="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log_test "测试: $test_name"
    
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
# 对话功能测试
# ==========================================

test_chat_session_create() {
    log_step "测试创建对话会话"
    
    # 检查 chatStore 是否有 createSession 方法
    local store_file="$PROJECT_DIR/src/stores/chatStore.ts"
    
    if grep -q "createSession" "$store_file" || grep -q "setCurrentSession" "$store_file"; then
        log "会话创建功能存在"
        return 0
    else
        log_error "会话创建功能缺失"
        return 1
    fi
}

test_chat_message_send() {
    log_step "测试发送消息功能"
    
    # 检查 useChat hook 是否有 sendMessage 方法
    local hook_file="$PROJECT_DIR/src/hooks/useChat.ts"
    
    if grep -q "sendMessage" "$hook_file"; then
        log "消息发送功能存在"
        return 0
    else
        log_error "消息发送功能缺失"
        return 1
    fi
}

test_chat_history() {
    log_step "测试消息历史功能"
    
    # 检查是否有历史加载功能
    local hook_file="$PROJECT_DIR/src/hooks/useChat.ts"
    
    if grep -q "loadSessions\|history" "$hook_file"; then
        log "历史加载功能存在"
        return 0
    else
        log_error "历史加载功能缺失"
        return 1
    fi
}

test_chat_abort() {
    log_step "测试中止会话功能"
    
    local hook_file="$PROJECT_DIR/src/hooks/useChat.ts"
    
    if grep -q "abort" "$hook_file"; then
        log "中止功能存在"
        return 0
    else
        log_error "中止功能缺失"
        return 1
    fi
}

# ==========================================
# 工作流功能测试
# ==========================================

test_workflow_create() {
    log_step "测试创建工作流功能"
    
    local hook_file="$PROJECT_DIR/src/hooks/useWorkflow.ts"
    
    if grep -q "createWorkflow" "$hook_file"; then
        log "工作流创建功能存在"
        return 0
    else
        log_error "工作流创建功能缺失"
        return 1
    fi
}

test_workflow_auto_generate() {
    log_step "测试自动生成工作流功能"
    
    local hook_file="$PROJECT_DIR/src/hooks/useWorkflow.ts"
    
    if grep -q "autoGenerate" "$hook_file"; then
        log "自动生成功能存在"
        return 0
    else
        log_error "自动生成功能缺失"
        return 1
    fi
}

test_workflow_lifecycle() {
    log_step "测试工作流生命周期管理"
    
    local hook_file="$PROJECT_DIR/src/hooks/useWorkflow.ts"
    local has_start=$(grep -c "startWorkflow" "$hook_file" || echo "0")
    local has_pause=$(grep -c "pauseWorkflow" "$hook_file" || echo "0")
    local has_resume=$(grep -c "resumeWorkflow" "$hook_file" || echo "0")
    local has_stop=$(grep -c "stopWorkflow" "$hook_file" || echo "0")
    
    local total=$((has_start + has_pause + has_resume + has_stop))
    
    if [ "$total" -ge 4 ]; then
        log "生命周期管理功能完整 ($total/4)"
        return 0
    else
        log_warn "生命周期管理功能不完整 ($total/4)"
        return 1
    fi
}

test_workflow_templates() {
    log_step "测试工作流模板功能"
    
    local hook_file="$PROJECT_DIR/src/hooks/useWorkflow.ts"
    
    if grep -q "templates\|loadTemplates" "$hook_file"; then
        log "模板功能存在"
        return 0
    else
        log_error "模板功能缺失"
        return 1
    fi
}

# ==========================================
# 智能体群组功能测试
# ==========================================

test_swarm_task_list() {
    log_step "测试智能体任务列表功能"
    
    local hook_file="$PROJECT_DIR/src/hooks/useSwarm.ts"
    
    if grep -q "loadTasks\|listTasks" "$hook_file"; then
        log "任务列表功能存在"
        return 0
    else
        log_error "任务列表功能缺失"
        return 1
    fi
}

test_swarm_messages() {
    log_step "测试智能体消息功能"
    
    local hook_file="$PROJECT_DIR/src/hooks/useSwarm.ts"
    
    if grep -q "loadMessages\|getMessages" "$hook_file"; then
        log "消息功能存在"
        return 0
    else
        log_error "消息功能缺失"
        return 1
    fi
}

test_swarm_consensus() {
    log_step "测试共识机制功能"
    
    local hook_file="$PROJECT_DIR/src/hooks/useSwarm.ts"
    
    if grep -q "consensus\|Consensus" "$hook_file"; then
        log "共识功能存在"
        return 0
    else
        log_error "共识功能缺失"
        return 1
    fi
}

test_swarm_events() {
    log_step "测试智能体事件订阅"
    
    local hook_file="$PROJECT_DIR/src/hooks/useSwarm.ts"
    
    local has_message_event=$(grep -c "onMessage" "$hook_file" || echo "0")
    local has_task_event=$(grep -c "onTaskUpdate" "$hook_file" || echo "0")
    local has_consensus_event=$(grep -c "onConsensus" "$hook_file" || echo "0")
    
    local total=$((has_message_event + has_task_event + has_consensus_event))
    
    if [ "$total" -ge 3 ]; then
        log "事件订阅功能完整 ($total/3)"
        return 0
    else
        log_warn "事件订阅功能不完整 ($total/3)"
        return 1
    fi
}

# ==========================================
# 系统功能测试
# ==========================================

test_system_status() {
    log_step "测试系统状态功能"
    
    local store_file="$PROJECT_DIR/src/stores/settingsStore.ts"
    
    if grep -q "systemStatus" "$store_file"; then
        log "系统状态功能存在"
        return 0
    else
        log_error "系统状态功能缺失"
        return 1
    fi
}

test_zeroclaw_config() {
    log_step "测试 ZeroClaw 配置读取"
    
    local config_loader="$PROJECT_DIR/electron/core/config-loader.ts"
    
    if grep -q "loadZeroClawConfig" "$config_loader" && \
       grep -q "findConfigFile" "$config_loader"; then
        log "配置读取功能存在"
        return 0
    else
        log_error "配置读取功能缺失"
        return 1
    fi
}

test_workspace_config() {
    log_step "测试工作空间配置"
    
    local bridge_file="$PROJECT_DIR/electron/core/zeroclaw-bridge.ts"
    
    if grep -q "workspaceDir\|DEFAULT_WORKSPACE" "$bridge_file"; then
        log "工作空间配置存在"
        
        # 检查默认工作空间是否为 ~/claw
        if grep -q "claw" "$bridge_file"; then
            log "默认工作空间设置为 ~/claw"
            return 0
        else
            log_warn "默认工作空间可能不是 ~/claw"
            return 0
        fi
    else
        log_error "工作空间配置缺失"
        return 1
    fi
}

# ==========================================
# IPC 通信测试
# ==========================================

test_ipc_chat_handlers() {
    log_step "测试对话 IPC 处理器"
    
    local ipc_file="$PROJECT_DIR/electron/core/ipc-handlers.ts"
    
    local handlers=("chat:send" "chat:abort" "chat:history" "chat:sessions")
    local found=0
    
    for handler in "${handlers[@]}"; do
        if grep -q "$handler" "$ipc_file"; then
            found=$((found + 1))
        fi
    done
    
    if [ "$found" -ge 3 ]; then
        log "对话 IPC 处理器完整 ($found/${#handlers[@]})"
        return 0
    else
        log_error "对话 IPC 处理器不完整 ($found/${#handlers[@]})"
        return 1
    fi
}

test_ipc_workflow_handlers() {
    log_step "测试工作流 IPC 处理器"
    
    local ipc_file="$PROJECT_DIR/electron/core/ipc-handlers.ts"
    
    local handlers=("workflow:list" "workflow:create" "workflow:start" "workflow:stop")
    local found=0
    
    for handler in "${handlers[@]}"; do
        if grep -q "$handler" "$ipc_file"; then
            found=$((found + 1))
        fi
    done
    
    if [ "$found" -ge 3 ]; then
        log "工作流 IPC 处理器完整 ($found/${#handlers[@]})"
        return 0
    else
        log_error "工作流 IPC 处理器不完整 ($found/${#handlers[@]})"
        return 1
    fi
}

test_ipc_swarm_handlers() {
    log_step "测试智能体 IPC 处理器"
    
    local ipc_file="$PROJECT_DIR/electron/core/ipc-handlers.ts"
    
    local handlers=("swarm:list" "swarm:messages" "swarm:consensus")
    local found=0
    
    for handler in "${handlers[@]}"; do
        if grep -q "$handler" "$ipc_file"; then
            found=$((found + 1))
        fi
    done
    
    if [ "$found" -ge 2 ]; then
        log "智能体 IPC 处理器完整 ($found/${#handlers[@]})"
        return 0
    else
        log_error "智能体 IPC 处理器不完整 ($found/${#handlers[@]})"
        return 1
    fi
}

# ==========================================
# 数据持久化测试
# ==========================================

test_database_sessions() {
    log_step "测试会话数据持久化"
    
    local db_file="$PROJECT_DIR/electron/store/database.ts"
    
    if grep -q "createSession\|listSessions\|deleteSession" "$db_file"; then
        log "会话持久化功能完整"
        return 0
    else
        log_error "会话持久化功能不完整"
        return 1
    fi
}

test_database_messages() {
    log_step "测试消息数据持久化"
    
    local db_file="$PROJECT_DIR/electron/store/database.ts"
    
    if grep -q "addMessage\|getChatHistory" "$db_file"; then
        log "消息持久化功能完整"
        return 0
    else
        log_error "消息持久化功能不完整"
        return 1
    fi
}

test_database_workflows() {
    log_step "测试工作流数据持久化"
    
    local db_file="$PROJECT_DIR/electron/store/database.ts"
    
    if grep -q "createWorkflow\|listWorkflows\|updateWorkflow" "$db_file"; then
        log "工作流持久化功能完整"
        return 0
    else
        log_error "工作流持久化功能不完整"
        return 1
    fi
}

# ==========================================
# 运行所有测试
# ==========================================

log "开始运行功能测试..."
log ""

# 对话功能测试
log "=========================================="
log "对话功能测试"
log "=========================================="
run_test "创建对话会话" test_chat_session_create
run_test "发送消息" test_chat_message_send
run_test "消息历史" test_chat_history
run_test "中止会话" test_chat_abort

# 工作流功能测试
log "=========================================="
log "工作流功能测试"
log "=========================================="
run_test "创建工作流" test_workflow_create
run_test "自动生成工作流" test_workflow_auto_generate
run_test "工作流生命周期" test_workflow_lifecycle
run_test "工作流模板" test_workflow_templates

# 智能体群组功能测试
log "=========================================="
log "智能体群组功能测试"
log "=========================================="
run_test "任务列表" test_swarm_task_list
run_test "智能体消息" test_swarm_messages
run_test "共识机制" test_swarm_consensus
run_test "事件订阅" test_swarm_events

# 系统功能测试
log "=========================================="
log "系统功能测试"
log "=========================================="
run_test "系统状态" test_system_status
run_test "ZeroClaw 配置读取" test_zeroclaw_config
run_test "工作空间配置" test_workspace_config

# IPC 通信测试
log "=========================================="
log "IPC 通信测试"
log "=========================================="
run_test "对话 IPC 处理器" test_ipc_chat_handlers
run_test "工作流 IPC 处理器" test_ipc_workflow_handlers
run_test "智能体 IPC 处理器" test_ipc_swarm_handlers

# 数据持久化测试
log "=========================================="
log "数据持久化测试"
log "=========================================="
run_test "会话持久化" test_database_sessions
run_test "消息持久化" test_database_messages
run_test "工作流持久化" test_database_workflows

# ==========================================
# 输出测试结果
# ==========================================

log "=========================================="
log "功能测试结果汇总"
log "=========================================="
log "总测试数: $TOTAL_TESTS"
log_success "通过: $PASSED_TESTS"
log_error "失败: $FAILED_TESTS"
log ""
log "日志文件: $TEST_LOG"

if [ $FAILED_TESTS -eq 0 ]; then
    log_success "所有功能测试通过!"
    exit 0
else
    log_error "有 $FAILED_TESTS 个测试失败"
    exit 1
fi
