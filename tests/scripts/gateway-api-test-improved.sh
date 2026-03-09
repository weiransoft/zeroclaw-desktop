#!/bin/bash

# ============================================================================
# ZeroClaw Gateway API 改进版接口测试脚本
# ============================================================================
# 改进内容：
# 1. 支持从环境变量或配置文件读取认证token
# 2. 修复JSON控制字符问题
# 3. 使用正确的事件类型命名（PascalCase）
# 4. 改进错误处理和日志输出
# ============================================================================

set -e

# 配置
BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
TEST_LOG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../logs" && pwd)"
TEST_LOG="$TEST_LOG_DIR/api-test-improved-$(date +%Y%m%d_%H%M%S).log"
REPORT_FILE="$TEST_LOG_DIR/api-test-report-improved-$(date +%Y%m%d_%H%M%S).json"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0
declare -a TEST_RESULTS

# 认证令牌（优先级：环境变量 > 配置文件 > 测试模式）
AUTH_TOKEN="${ZEROCRAW_TOKEN:-}"

# 创建日志目录
mkdir -p "$TEST_LOG_DIR"

# ============================================================================
# 工具函数
# ============================================================================

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[$timestamp]${NC} $1" | tee -a "$TEST_LOG"
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

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1" | tee -a "$TEST_LOG"
}

# 记录测试结果
record_test() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    local response="$4"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    local result_entry="{\"name\":\"$test_name\",\"status\":\"$status\",\"message\":\"$message\",\"timestamp\":\"$(date -Iseconds)\"}"
    TEST_RESULTS+=("$result_entry")

    case "$status" in
        "pass")
            PASSED_TESTS=$((PASSED_TESTS + 1))
            log_success "$test_name - $message"
            ;;
        "fail")
            FAILED_TESTS=$((FAILED_TESTS + 1))
            log_error "$test_name - $message"
            if [ -n "$response" ]; then
                log_info "响应: $response"
            fi
            ;;
        "skip")
            SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
            log_warn "$test_name - $message"
            ;;
    esac
}

# HTTP 请求封装（改进版）
http_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local headers="$4"
    local expected_status="$5"

    local curl_cmd="curl -s -X $method"
    curl_cmd="$curl_cmd -w '\n%{http_code}'"

    # 添加认证头
    if [ -n "$AUTH_TOKEN" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $AUTH_TOKEN'"
    fi

    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi

    if [ -n "$data" ]; then
        # 确保JSON数据不包含控制字符
        local clean_data=$(echo "$data" | tr -d '\000-\037')
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$clean_data'"
    fi

    curl_cmd="$curl_cmd '$BASE_URL$endpoint'"

    local response
    response=$(eval "$curl_cmd" 2>/dev/null)

    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | sed '$d')

    echo "$http_code|$body"
}

# 检查 HTTP 状态码
check_status() {
    local actual="$1"
    local expected="$2"

    if [ "$actual" = "$expected" ]; then
        return 0
    else
        return 1
    fi
}

# 检查 JSON 字段存在
check_json_field() {
    local json="$1"
    local field="$2"

    echo "$json" | jq -e ".$field" > /dev/null 2>&1
}

# 获取 JSON 字段值
get_json_field() {
    local json="$1"
    local field="$2"

    echo "$json" | jq -r ".$field // empty" 2>/dev/null
}

# ============================================================================
# Token 获取函数
# ============================================================================

get_auth_token() {
    log "尝试获取认证令牌..."

    # 1. 检查环境变量
    if [ -n "$ZEROCRAW_TOKEN" ]; then
        log_info "从环境变量获取到token"
        AUTH_TOKEN="$ZEROCRAW_TOKEN"
        return 0
    fi

    # 2. 尝试从Desktop应用配置获取（需要解密，这里跳过）
    log_warn "未找到环境变量 ZEROCRAW_TOKEN"

    # 3. 尝试获取配对码并配对
    log_info "尝试获取配对码..."
    local result=$(http_request "GET" "/debug/pairing-code" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "200"; then
        local pairing_code=$(get_json_field "$body" "pairing_code")
        if [ -n "$pairing_code" ]; then
            log_info "获取到配对码: $pairing_code"
            # 使用配对码进行配对
            local pair_result=$(http_request "POST" "/pair" "" "-H 'X-Pairing-Code: $pairing_code'" "200")
            local pair_status=$(echo "$pair_result" | cut -d'|' -f1)
            local pair_body=$(echo "$pair_result" | cut -d'|' -f2-)

            if check_status "$pair_status" "200"; then
                local token=$(get_json_field "$pair_body" "token")
                if [ -n "$token" ]; then
                    AUTH_TOKEN="$token"
                    log_success "成功获取认证令牌"
                    return 0
                fi
            fi
        else
            local is_paired=$(get_json_field "$body" "is_paired")
            if [ "$is_paired" = "true" ]; then
                log_warn "Gateway已配对，但无法获取token"
                log_warn "请设置环境变量 ZEROCRAW_TOKEN 或重启Gateway以生成新的配对码"
            fi
        fi
    fi

    log_error "无法获取认证令牌，大部分测试将失败"
    return 1
}

# ============================================================================
# 测试用例 - 基础接口
# ============================================================================

test_health_check() {
    log "测试: GET /health - 健康检查"

    local result=$(http_request "GET" "/health" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "200"; then
        if check_json_field "$body" "status" && [ "$(get_json_field "$body" "status")" = "ok" ]; then
            record_test "GET /health - 健康检查" "pass" "返回正确的健康状态"
        else
            record_test "GET /health - 健康检查" "fail" "响应格式不正确" "$body"
        fi
    else
        record_test "GET /health - 健康检查" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_pairing_code() {
    log "测试: GET /debug/pairing-code - 获取配对码"

    local result=$(http_request "GET" "/debug/pairing-code" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "200"; then
        local pairing_code=$(get_json_field "$body" "pairing_code")
        if [ -n "$pairing_code" ]; then
            record_test "GET /debug/pairing-code" "pass" "成功获取配对码: $pairing_code"
        else
            local is_paired=$(get_json_field "$body" "is_paired")
            if [ "$is_paired" = "true" ]; then
                record_test "GET /debug/pairing-code" "skip" "已经配对，无需配对码"
            else
                record_test "GET /debug/pairing-code" "fail" "无法获取配对码" "$body"
            fi
        fi
    else
        record_test "GET /debug/pairing-code" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_pair_invalid_code() {
    log "测试: POST /pair - 无效配对码"

    local result=$(http_request "POST" "/pair" "" "-H 'X-Pairing-Code: invalid_code_12345'" "403")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "403"; then
        record_test "POST /pair - 无效配对码" "pass" "正确拒绝无效配对码"
    else
        record_test "POST /pair - 无效配对码" "fail" "应返回403，实际返回: $status" "$body"
    fi
}

# ============================================================================
# 测试用例 - 成本接口
# ============================================================================

test_cost_summary() {
    log "测试: GET /cost/summary - 成本汇总"

    local result=$(http_request "GET" "/cost/summary" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "200"; then
        if check_json_field "$body" "enabled" && check_json_field "$body" "total_tokens"; then
            record_test "GET /cost/summary" "pass" "成功获取成本汇总"
        else
            record_test "GET /cost/summary" "fail" "响应格式不正确" "$body"
        fi
    elif check_status "$status" "401"; then
        record_test "GET /cost/summary" "skip" "需要认证"
    else
        record_test "GET /cost/summary" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_cost_daily() {
    log "测试: GET /cost/daily - 每日成本"

    local result=$(http_request "GET" "/cost/daily" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "200"; then
        if check_json_field "$body" "date" && check_json_field "$body" "cost_usd"; then
            record_test "GET /cost/daily" "pass" "成功获取每日成本"
        else
            record_test "GET /cost/daily" "fail" "响应格式不正确" "$body"
        fi
    elif check_status "$status" "401"; then
        record_test "GET /cost/daily" "skip" "需要认证"
    else
        record_test "GET /cost/daily" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

# ============================================================================
# 测试用例 - 工作流接口
# ============================================================================

test_workflow_list() {
    log "测试: GET /workflow/list - 工作流列表"

    local result=$(http_request "GET" "/workflow/list" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "200"; then
        record_test "GET /workflow/list" "pass" "成功获取工作流列表"
    elif check_status "$status" "401"; then
        record_test "GET /workflow/list" "skip" "需要认证"
    else
        record_test "GET /workflow/list" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_workflow_create() {
    log "测试: POST /workflow/create - 创建工作流"

    local workflow_data='{"name":"测试工作流","description":"这是一个测试工作流","roles":["developer","reviewer"]}'

    local result=$(http_request "POST" "/workflow/create" "$workflow_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "200"; then
        local success=$(get_json_field "$body" "success")
        if [ "$success" = "true" ] || check_json_field "$body" "workflow.id"; then
            local workflow_id=$(get_json_field "$body" "workflow.id")
            record_test "POST /workflow/create" "pass" "成功创建工作流: $workflow_id"
            echo "$workflow_id"
        else
            record_test "POST /workflow/create" "fail" "创建失败" "$body"
            echo ""
        fi
    elif check_status "$status" "401"; then
        record_test "POST /workflow/create" "skip" "需要认证"
        echo ""
    else
        record_test "POST /workflow/create" "fail" "HTTP状态码错误: $status" "$body"
        echo ""
    fi
}

# ============================================================================
# 测试用例 - 事件驱动接口
# ============================================================================

test_event_listener_list() {
    log "测试: GET /event/listener/list - 事件监听器列表"

    local result=$(http_request "GET" "/event/listener/list" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "200"; then
        record_test "GET /event/listener/list" "pass" "成功获取事件监听器列表"
    elif check_status "$status" "401"; then
        record_test "GET /event/listener/list" "skip" "需要认证"
    else
        record_test "GET /event/listener/list" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_event_publish() {
    log "测试: POST /event/publish - 发布事件"

    # 使用正确的PascalCase事件类型
    local event_data='{"event_type":"WorkflowStarted","source":"test","data":{"test":"data"}}'

    local result=$(http_request "POST" "/event/publish" "$event_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "200"; then
        record_test "POST /event/publish" "pass" "成功发布事件"
    elif check_status "$status" "401"; then
        record_test "POST /event/publish" "skip" "需要认证"
    else
        record_test "POST /event/publish" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

# ============================================================================
# 测试用例 - 智能体团队接口
# ============================================================================

test_agent_groups_list() {
    log "测试: GET /agent-groups - 智能体团队列表"

    local result=$(http_request "GET" "/agent-groups" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "200"; then
        record_test "GET /agent-groups" "pass" "成功获取智能体团队列表"
    elif check_status "$status" "401"; then
        record_test "GET /agent-groups" "skip" "需要认证"
    else
        record_test "GET /agent-groups" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

# ============================================================================
# 测试用例 - 角色映射接口
# ============================================================================

test_role_mappings_list() {
    log "测试: GET /role-mappings - 角色映射列表"

    local result=$(http_request "GET" "/role-mappings" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "200"; then
        record_test "GET /role-mappings" "pass" "成功获取角色映射列表"
    elif check_status "$status" "401"; then
        record_test "GET /role-mappings" "skip" "需要认证"
    else
        record_test "GET /role-mappings" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

# ============================================================================
# 测试用例 - Swarm 智能体群聊接口
# ============================================================================

test_swarm_tasks_list() {
    log "测试: GET /swarm/tasks - 任务列表"

    local result=$(http_request "GET" "/swarm/tasks" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "200"; then
        record_test "GET /swarm/tasks" "pass" "成功获取任务列表"
    elif check_status "$status" "401"; then
        record_test "GET /swarm/tasks" "skip" "需要认证"
    else
        record_test "GET /swarm/tasks" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

# ============================================================================
# 测试用例 - Soul 模板接口
# ============================================================================

test_soul_templates_list() {
    log "测试: GET /soul/templates - 模板列表"

    local result=$(http_request "GET" "/soul/templates" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "200"; then
        record_test "GET /soul/templates" "pass" "成功获取Soul模板列表"
    elif check_status "$status" "401"; then
        record_test "GET /soul/templates" "skip" "需要认证"
    else
        record_test "GET /soul/templates" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

# ============================================================================
# 测试用例 - MCP 服务器接口
# ============================================================================

test_mcp_servers_list() {
    log "测试: GET /mcp/servers - 服务器列表"

    local result=$(http_request "GET" "/mcp/servers" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "200"; then
        record_test "GET /mcp/servers" "pass" "成功获取MCP服务器列表"
    elif check_status "$status" "401"; then
        record_test "GET /mcp/servers" "skip" "需要认证"
    else
        record_test "GET /mcp/servers" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

# ============================================================================
# 测试用例 - 可观测性接口
# ============================================================================

test_observability_dashboard() {
    log "测试: GET /observability/dashboard - 仪表盘"

    local result=$(http_request "GET" "/observability/dashboard" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)

    if check_status "$status" "200"; then
        record_test "GET /observability/dashboard" "pass" "成功获取仪表盘数据"
    elif check_status "$status" "401"; then
        record_test "GET /observability/dashboard" "skip" "需要认证"
    elif check_status "$status" "503"; then
        record_test "GET /observability/dashboard" "skip" "可观测性未启用"
    else
        record_test "GET /observability/dashboard" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

# ============================================================================
# 主测试流程
# ============================================================================

main() {
    log "=========================================="
    log "ZeroClaw Gateway API 改进版接口测试"
    log "=========================================="
    log "测试时间: $(date)"
    log "目标服务: $BASE_URL"
    log "日志文件: $TEST_LOG"
    log ""

    # 检查服务是否可用
    log "检查服务可用性..."
    if ! curl -s --connect-timeout 5 "$BASE_URL/health" > /dev/null 2>&1; then
        log_error "服务不可用: $BASE_URL"
        log_error "请确保 ZeroClaw Gateway 正在运行"
        exit 1
    fi
    log_success "服务可用"
    log ""

    # 获取认证token
    log "=========================================="
    log "获取认证令牌"
    log "=========================================="
    get_auth_token
    log ""

    # ========================================
    # 1. 基础接口测试
    # ========================================
    log "=========================================="
    log "1. 基础接口测试"
    log "=========================================="

    test_health_check
    test_pairing_code
    test_pair_invalid_code
    log ""

    # ========================================
    # 2. 成本接口测试
    # ========================================
    log "=========================================="
    log "2. 成本接口测试"
    log "=========================================="

    test_cost_summary
    test_cost_daily
    log ""

    # ========================================
    # 3. 工作流接口测试
    # ========================================
    log "=========================================="
    log "3. 工作流接口测试"
    log "=========================================="

    test_workflow_list
    test_workflow_create
    log ""

    # ========================================
    # 4. 事件驱动接口测试
    # ========================================
    log "=========================================="
    log "4. 事件驱动接口测试"
    log "=========================================="

    test_event_listener_list
    test_event_publish
    log ""

    # ========================================
    # 5. 智能体团队接口测试
    # ========================================
    log "=========================================="
    log "5. 智能体团队接口测试"
    log "=========================================="

    test_agent_groups_list
    log ""

    # ========================================
    # 6. 角色映射接口测试
    # ========================================
    log "=========================================="
    log "6. 角色映射接口测试"
    log "=========================================="

    test_role_mappings_list
    log ""

    # ========================================
    # 7. Swarm 智能体群聊接口测试
    # ========================================
    log "=========================================="
    log "7. Swarm 智能体群聊接口测试"
    log "=========================================="

    test_swarm_tasks_list
    log ""

    # ========================================
    # 8. Soul 模板接口测试
    # ========================================
    log "=========================================="
    log "8. Soul 模板接口测试"
    log "=========================================="

    test_soul_templates_list
    log ""

    # ========================================
    # 9. MCP 服务器接口测试
    # ========================================
    log "=========================================="
    log "9. MCP 服务器接口测试"
    log "=========================================="

    test_mcp_servers_list
    log ""

    # ========================================
    # 10. 可观测性接口测试
    # ========================================
    log "=========================================="
    log "10. 可观测性接口测试"
    log "=========================================="

    test_observability_dashboard
    log ""

    # ========================================
    # 输出测试结果汇总
    # ========================================
    log "=========================================="
    log "测试结果汇总"
    log "=========================================="
    log "总测试数: $TOTAL_TESTS"
    log_success "通过: $PASSED_TESTS"
    log_error "失败: $FAILED_TESTS"
    log_warn "跳过: $SKIPPED_TESTS"
    log ""

    # 计算通过率
    local pass_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        pass_rate=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
    fi
    log "通过率: ${pass_rate}%"
    log ""
    log "日志文件: $TEST_LOG"

    # 生成 JSON 报告
    echo "{\"timestamp\":\"$(date -Iseconds)\",\"total\":$TOTAL_TESTS,\"passed\":$PASSED_TESTS,\"failed\":$FAILED_TESTS,\"skipped\":$SKIPPED_TESTS,\"pass_rate\":$pass_rate,\"results\":[$(IFS=,; echo "${TEST_RESULTS[*]}")]}" > "$REPORT_FILE"
    log "报告文件: $REPORT_FILE"

    if [ $FAILED_TESTS -eq 0 ]; then
        log_success "所有测试通过!"
        exit 0
    else
        log_error "有 $FAILED_TESTS 个测试失败"
        exit 1
    fi
}

# 运行主函数
main "$@"
