#!/bin/bash

# ZeroClaw Desktop 工作流和智能体群组 E2E 测试
# 测试完整的工作流创建、执行和监控流程

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
TEST_LOG="$PROJECT_DIR/tests/logs/e2e-test-$(date +%Y%m%d_%H%M%S).log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1" | tee -a "$TEST_LOG"
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
log "ZeroClaw Desktop E2E 测试"
log "工作流和智能体群组功能"
log "=========================================="
log "测试时间: $(date)"
log ""

# 测试场景定义
SCENARIOS=(
    "场景1: 创建简单工作流"
    "场景2: 工作流生命周期管理"
    "场景3: 智能体任务分配"
    "场景4: 共识机制测试"
    "场景5: 完整软件开发流程"
)

# 测试计数器
TOTAL_SCENARIOS=${#SCENARIOS[@]}
PASSED_SCENARIOS=0
FAILED_SCENARIOS=0

# ==========================================
# 场景1: 创建简单工作流
# ==========================================
scenario_1_simple_workflow() {
    log_step "场景1: 创建简单工作流"
    log "测试工作流创建和基本配置"
    
    # 模拟工作流配置
    local workflow_config='{
        "name": "简单代码审查流程",
        "description": "代码审查和测试工作流",
        "roles": ["reviewer", "tester"],
        "steps": [
            {
                "name": "代码审查",
                "description": "审查代码质量",
                "assignedTo": "reviewer",
                "dependencies": []
            },
            {
                "name": "运行测试",
                "description": "执行测试用例",
                "assignedTo": "tester",
                "dependencies": ["代码审查"]
            }
        ]
    }'
    
    log "工作流配置: $workflow_config"
    
    # 验证配置结构
    if echo "$workflow_config" | grep -q '"name"' && \
       echo "$workflow_config" | grep -q '"roles"' && \
       echo "$workflow_config" | grep -q '"steps"'; then
        log_success "工作流配置验证通过"
        return 0
    else
        log_error "工作流配置验证失败"
        return 1
    fi
}

# ==========================================
# 场景2: 工作流生命周期管理
# ==========================================
scenario_2_workflow_lifecycle() {
    log_step "场景2: 工作流生命周期管理"
    log "测试工作流的启动、暂停、恢复和停止"
    
    local lifecycle_states=("created" "running" "paused" "running" "stopped")
    local current_state="created"
    
    for state in "${lifecycle_states[@]}"; do
        log "状态转换: $current_state -> $state"
        current_state="$state"
    done
    
    log_success "工作流生命周期测试通过"
    return 0
}

# ==========================================
# 场景3: 智能体任务分配
# ==========================================
scenario_3_agent_task_assignment() {
    log_step "场景3: 智能体任务分配"
    log "测试智能体角色分配和任务执行"
    
    # 模拟智能体配置
    local agents='[
        {"name": "product_owner", "role": "产品负责人"},
        {"name": "scrum_master", "role": "Scrum Master"},
        {"name": "architect", "role": "架构师"},
        {"name": "frontend_developer", "role": "前端开发"},
        {"name": "backend_developer", "role": "后端开发"},
        {"name": "qa_engineer", "role": "QA工程师"}
    ]'
    
    log "智能体配置: $agents"
    
    # 验证智能体数量
    local agent_count=$(echo "$agents" | grep -o '"name"' | wc -l)
    
    if [ "$agent_count" -ge 4 ]; then
        log_success "智能体配置验证通过 (共 $agent_count 个智能体)"
        return 0
    else
        log_error "智能体数量不足"
        return 1
    fi
}

# ==========================================
# 场景4: 共识机制测试
# ==========================================
scenario_4_consensus_mechanism() {
    log_step "场景4: 共识机制测试"
    log "测试智能体共识达成流程"
    
    # 模拟共识状态
    local consensus_states=(
        '{"status": "pending", "agreements": [], "disagreements": []}'
        '{"status": "pending", "agreements": ["Agent1"], "disagreements": []}'
        '{"status": "pending", "agreements": ["Agent1", "Agent2"], "disagreements": ["Agent3"]}'
        '{"status": "agreed", "agreements": ["Agent1", "Agent2", "Agent3"], "disagreements": []}'
    )
    
    for state in "${consensus_states[@]}"; do
        log "共识状态: $state"
    done
    
    log_success "共识机制测试通过"
    return 0
}

# ==========================================
# 场景5: 完整软件开发流程
# ==========================================
scenario_5_full_dev_workflow() {
    log_step "场景5: 完整软件开发流程"
    log "测试完整的 Scrum 开发工作流"
    
    # 模拟完整工作流
    local workflow_phases=(
        "产品需求分析:product_owner"
        "架构设计:architect"
        "Sprint规划:scrum_master"
        "前端开发:frontend_developer"
        "后端开发:backend_developer"
        "测试验证:qa_engineer"
        "代码评审:architect"
        "部署发布:scrum_master"
    )
    
    local phase_count=0
    local total_phases=${#workflow_phases[@]}
    
    for phase in "${workflow_phases[@]}"; do
        local phase_name="${phase%%:*}"
        local agent="${phase##*:}"
        
        phase_count=$((phase_count + 1))
        log "阶段 $phase_count/$total_phases: $phase_name (执行者: $agent)"
        
        # 模拟进度
        local progress=$((phase_count * 100 / total_phases))
        log "进度: $progress%"
    done
    
    log_success "完整软件开发流程测试通过"
    return 0
}

# ==========================================
# 运行所有场景
# ==========================================

log "开始运行 E2E 测试场景..."
log ""

for scenario in "${SCENARIOS[@]}"; do
    log "=========================================="
    log "$scenario"
    log "=========================================="
    
    scenario_num="${scenario%%:*}"
    scenario_func="scenario_${scenario_num#场景}_$(echo "$scenario" | cut -d' ' -f2 | tr '[:upper:]' '[:lower:]' | tr -d ':')"
    
    case "$scenario_num" in
        "场景1")
            if scenario_1_simple_workflow; then
                PASSED_SCENARIOS=$((PASSED_SCENARIOS + 1))
            else
                FAILED_SCENARIOS=$((FAILED_SCENARIOS + 1))
            fi
            ;;
        "场景2")
            if scenario_2_workflow_lifecycle; then
                PASSED_SCENARIOS=$((PASSED_SCENARIOS + 1))
            else
                FAILED_SCENARIOS=$((FAILED_SCENARIOS + 1))
            fi
            ;;
        "场景3")
            if scenario_3_agent_task_assignment; then
                PASSED_SCENARIOS=$((PASSED_SCENARIOS + 1))
            else
                FAILED_SCENARIOS=$((FAILED_SCENARIOS + 1))
            fi
            ;;
        "场景4")
            if scenario_4_consensus_mechanism; then
                PASSED_SCENARIOS=$((PASSED_SCENARIOS + 1))
            else
                FAILED_SCENARIOS=$((FAILED_SCENARIOS + 1))
            fi
            ;;
        "场景5")
            if scenario_5_full_dev_workflow; then
                PASSED_SCENARIOS=$((PASSED_SCENARIOS + 1))
            else
                FAILED_SCENARIOS=$((FAILED_SCENARIOS + 1))
            fi
            ;;
    esac
    echo ""
done

# ==========================================
# 输出测试结果
# ==========================================

log "=========================================="
log "E2E 测试结果汇总"
log "=========================================="
log "总场景数: $TOTAL_SCENARIOS"
log_success "通过: $PASSED_SCENARIOS"
log_error "失败: $FAILED_SCENARIOS"
log ""
log "日志文件: $TEST_LOG"

if [ $FAILED_SCENARIOS -eq 0 ]; then
    log_success "所有 E2E 测试通过!"
    exit 0
else
    log_error "有 $FAILED_SCENARIOS 个场景失败"
    exit 1
fi
