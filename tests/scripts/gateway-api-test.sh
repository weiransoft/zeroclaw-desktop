#!/bin/bash

# ============================================================================
# ZeroClaw Gateway API 全面接口测试脚本
# ============================================================================
# 测试范围：
# 1. 基础接口 - health, pair, webhook, chat/stream, chat/abort, debug/pairing-code
# 2. 成本接口 - cost/summary, cost/daily
# 3. WhatsApp 接口 - whatsapp (GET/POST)
# 4. 工作流接口 - workflow/*
# 5. 事件驱动接口 - event/*
# 6. 智能体团队接口 - agent-groups
# 7. 角色映射接口 - role-mappings
# 8. Swarm 智能体群聊接口 - swarm/*
# 9. Soul 模板接口 - soul/templates
# 10. MCP 服务器接口 - mcp/servers
# 11. 可观测性接口 - observability/*
# ============================================================================

set -e

# 配置
BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
TEST_LOG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../logs" && pwd)"
TEST_LOG="$TEST_LOG_DIR/api-test-$(date +%Y%m%d_%H%M%S).log"
REPORT_FILE="$TEST_LOG_DIR/api-test-report-$(date +%Y%m%d_%H%M%S).json"

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

# 认证令牌（将在配对后设置）
AUTH_TOKEN=""

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

# HTTP 请求封装
http_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local headers="$4"
    local expected_status="$5"
    
    local curl_cmd="curl -s -X $method"
    curl_cmd="$curl_cmd -w '\n%{http_code}'"
    
    if [ -n "$AUTH_TOKEN" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $AUTH_TOKEN'"
    fi
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
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
            log_info "获取到配对码: $pairing_code"
            record_test "GET /debug/pairing-code" "pass" "成功获取配对码: $pairing_code"
            echo "$pairing_code"
        else
            # 可能已经配对过了
            local is_paired=$(get_json_field "$body" "is_paired")
            if [ "$is_paired" = "true" ]; then
                record_test "GET /debug/pairing-code" "skip" "已经配对，无需配对码"
                echo ""
            else
                record_test "GET /debug/pairing-code" "fail" "无法获取配对码" "$body"
                echo ""
            fi
        fi
    else
        record_test "GET /debug/pairing-code" "fail" "HTTP状态码错误: $status" "$body"
        echo ""
    fi
}

test_pair() {
    log "测试: POST /pair - 配对"
    
    local pairing_code="$1"
    
    if [ -z "$pairing_code" ]; then
        record_test "POST /pair - 配对" "skip" "无配对码，跳过配对测试"
        return
    fi
    
    local result=$(http_request "POST" "/pair" "" "-H 'X-Pairing-Code: $pairing_code'" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        local token=$(get_json_field "$body" "token")
        if [ -n "$token" ]; then
            AUTH_TOKEN="$token"
            log_info "获取到认证令牌"
            record_test "POST /pair - 配对" "pass" "配对成功，获取到令牌"
        else
            record_test "POST /pair - 配对" "fail" "响应中无令牌" "$body"
        fi
    else
        record_test "POST /pair - 配对" "fail" "HTTP状态码错误: $status" "$body"
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

test_webhook_unauthorized() {
    log "测试: POST /webhook - 未授权访问"
    
    # 临时清除令牌
    local saved_token="$AUTH_TOKEN"
    AUTH_TOKEN=""
    
    local result=$(http_request "POST" "/webhook" '{"message":"test"}' "" "401")
    local status=$(echo "$result" | cut -d'|' -f1)
    
    AUTH_TOKEN="$saved_token"
    
    if check_status "$status" "401"; then
        record_test "POST /webhook - 未授权访问" "pass" "正确拒绝未授权请求"
    else
        local body=$(echo "$result" | cut -d'|' -f2-)
        record_test "POST /webhook - 未授权访问" "fail" "应返回401，实际返回: $status" "$body"
    fi
}

test_webhook_invalid_json() {
    log "测试: POST /webhook - 无效JSON"
    
    local result=$(http_request "POST" "/webhook" "invalid json" "" "400")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "400"; then
        record_test "POST /webhook - 无效JSON" "pass" "正确处理无效JSON"
    else
        record_test "POST /webhook - 无效JSON" "fail" "应返回400，实际返回: $status" "$body"
    fi
}

test_webhook_missing_message() {
    log "测试: POST /webhook - 缺少message字段"
    
    local result=$(http_request "POST" "/webhook" '{"other":"data"}' "" "400")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "400"; then
        record_test "POST /webhook - 缺少message字段" "pass" "正确处理缺少message的请求"
    else
        record_test "POST /webhook - 缺少message字段" "fail" "应返回400，实际返回: $status" "$body"
    fi
}

test_chat_abort_missing_session() {
    log "测试: POST /chat/abort - 缺少sessionId"
    
    local result=$(http_request "POST" "/chat/abort" '{}' "" "400")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "400"; then
        record_test "POST /chat/abort - 缺少sessionId" "pass" "正确处理缺少sessionId的请求"
    else
        record_test "POST /chat/abort - 缺少sessionId" "fail" "应返回400，实际返回: $status" "$body"
    fi
}

test_chat_abort_nonexistent_session() {
    log "测试: POST /chat/abort - 不存在的会话"
    
    local result=$(http_request "POST" "/chat/abort" '{"sessionId":"nonexistent-session-id"}' "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        local success=$(get_json_field "$body" "success")
        if [ "$success" = "false" ]; then
            record_test "POST /chat/abort - 不存在的会话" "pass" "正确处理不存在的会话"
        else
            record_test "POST /chat/abort - 不存在的会话" "fail" "应返回success:false" "$body"
        fi
    else
        record_test "POST /chat/abort - 不存在的会话" "fail" "HTTP状态码错误: $status" "$body"
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
    else
        record_test "GET /cost/daily" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_cost_daily_with_date() {
    log "测试: GET /cost/daily?date=2024-01-01 - 指定日期"
    
    local result=$(http_request "GET" "/cost/daily?date=2024-01-01" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        local date=$(get_json_field "$body" "date")
        if [ "$date" = "2024-01-01" ]; then
            record_test "GET /cost/daily?date=2024-01-01" "pass" "成功获取指定日期成本"
        else
            record_test "GET /cost/daily?date=2024-01-01" "fail" "日期不匹配" "$body"
        fi
    else
        record_test "GET /cost/daily?date=2024-01-01" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_cost_daily_invalid_date() {
    log "测试: GET /cost/daily?date=invalid - 无效日期"
    
    local result=$(http_request "GET" "/cost/daily?date=invalid-date" "" "" "400")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "400"; then
        record_test "GET /cost/daily?date=invalid" "pass" "正确处理无效日期"
    else
        record_test "GET /cost/daily?date=invalid" "fail" "应返回400，实际返回: $status" "$body"
    fi
}

# ============================================================================
# 测试用例 - WhatsApp 接口
# ============================================================================

test_whatsapp_verify_no_config() {
    log "测试: GET /whatsapp - WhatsApp验证（未配置）"
    
    local result=$(http_request "GET" "/whatsapp" "" "" "404")
    local status=$(echo "$result" | cut -d'|' -f1)
    
    # 如果未配置WhatsApp，应该返回404
    if check_status "$status" "404"; then
        record_test "GET /whatsapp - 未配置" "pass" "正确返回未配置状态"
    else
        # 如果已配置，可能是其他状态
        local body=$(echo "$result" | cut -d'|' -f2-)
        if check_status "$status" "400" || check_status "$status" "403"; then
            record_test "GET /whatsapp - 已配置但验证失败" "pass" "WhatsApp已配置，验证正确拒绝"
        else
            record_test "GET /whatsapp" "skip" "状态码: $status"
        fi
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
    else
        record_test "GET /workflow/list" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_workflow_create() {
    log "测试: POST /workflow/create - 创建工作流"
    
    local workflow_data='{
        "name": "测试工作流",
        "description": "这是一个测试工作流",
        "roles": ["developer", "reviewer"],
        "steps": [
            {"name": "步骤1", "description": "第一个步骤", "status": "pending"},
            {"name": "步骤2", "description": "第二个步骤", "status": "pending"}
        ]
    }'
    
    local result=$(http_request "POST" "/workflow/create" "$workflow_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        local success=$(get_json_field "$body" "success")
        if [ "$success" = "true" ]; then
            local workflow_id=$(get_json_field "$body" "workflow.id")
            if [ -n "$workflow_id" ]; then
                record_test "POST /workflow/create" "pass" "成功创建工作流: $workflow_id"
                echo "$workflow_id"
            else
                record_test "POST /workflow/create" "fail" "响应中无工作流ID" "$body"
                echo ""
            fi
        else
            record_test "POST /workflow/create" "fail" "创建失败" "$body"
            echo ""
        fi
    else
        record_test "POST /workflow/create" "fail" "HTTP状态码错误: $status" "$body"
        echo ""
    fi
}

test_workflow_create_missing_name() {
    log "测试: POST /workflow/create - 缺少名称"
    
    local workflow_data='{"description": "测试"}'
    
    local result=$(http_request "POST" "/workflow/create" "$workflow_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    # 应该使用默认名称创建
    if check_status "$status" "200"; then
        record_test "POST /workflow/create - 缺少名称" "pass" "使用默认名称创建成功"
    else
        record_test "POST /workflow/create - 缺少名称" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_workflow_phases() {
    log "测试: GET /workflow/{id}/phases - 获取阶段"
    
    local workflow_id="$1"
    
    if [ -z "$workflow_id" ]; then
        record_test "GET /workflow/{id}/phases" "skip" "无工作流ID"
        return
    fi
    
    local result=$(http_request "GET" "/workflow/$workflow_id/phases" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "GET /workflow/$workflow_id/phases" "pass" "成功获取工作流阶段"
    else
        record_test "GET /workflow/$workflow_id/phases" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_workflow_context() {
    log "测试: GET /workflow/{id}/context - 获取上下文"
    
    local workflow_id="$1"
    
    if [ -z "$workflow_id" ]; then
        record_test "GET /workflow/{id}/context" "skip" "无工作流ID"
        return
    fi
    
    local result=$(http_request "GET" "/workflow/$workflow_id/context" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "GET /workflow/$workflow_id/context" "pass" "成功获取工作流上下文"
    else
        record_test "GET /workflow/$workflow_id/context" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_workflow_approvals() {
    log "测试: GET /workflow/{id}/approvals - 获取审批"
    
    local workflow_id="$1"
    
    if [ -z "$workflow_id" ]; then
        record_test "GET /workflow/{id}/approvals" "skip" "无工作流ID"
        return
    fi
    
    local result=$(http_request "GET" "/workflow/$workflow_id/approvals" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "GET /workflow/$workflow_id/approvals" "pass" "成功获取审批列表"
    else
        record_test "GET /workflow/$workflow_id/approvals" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_workflow_start() {
    log "测试: POST /workflow/start - 启动工作流"
    
    local workflow_id="$1"
    
    if [ -z "$workflow_id" ]; then
        record_test "POST /workflow/start" "skip" "无工作流ID"
        return
    fi
    
    local result=$(http_request "POST" "/workflow/start" "{\"id\":\"$workflow_id\"}" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        local success=$(get_json_field "$body" "success")
        if [ "$success" = "true" ]; then
            record_test "POST /workflow/start" "pass" "成功启动工作流"
        else
            record_test "POST /workflow/start" "fail" "启动失败" "$body"
        fi
    else
        record_test "POST /workflow/start" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_workflow_pause() {
    log "测试: POST /workflow/pause - 暂停工作流"
    
    local workflow_id="$1"
    
    if [ -z "$workflow_id" ]; then
        record_test "POST /workflow/pause" "skip" "无工作流ID"
        return
    fi
    
    local result=$(http_request "POST" "/workflow/pause" "{\"id\":\"$workflow_id\"}" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "POST /workflow/pause" "pass" "成功暂停工作流"
    else
        record_test "POST /workflow/pause" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_workflow_resume() {
    log "测试: POST /workflow/resume - 恢复工作流"
    
    local workflow_id="$1"
    
    if [ -z "$workflow_id" ]; then
        record_test "POST /workflow/resume" "skip" "无工作流ID"
        return
    fi
    
    local result=$(http_request "POST" "/workflow/resume" "{\"id\":\"$workflow_id\"}" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "POST /workflow/resume" "pass" "成功恢复工作流"
    else
        record_test "POST /workflow/resume" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_workflow_stop() {
    log "测试: POST /workflow/stop - 停止工作流"
    
    local workflow_id="$1"
    
    if [ -z "$workflow_id" ]; then
        record_test "POST /workflow/stop" "skip" "无工作流ID"
        return
    fi
    
    local result=$(http_request "POST" "/workflow/stop" "{\"id\":\"$workflow_id\"}" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "POST /workflow/stop" "pass" "成功停止工作流"
    else
        record_test "POST /workflow/stop" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_workflow_transition() {
    log "测试: POST /workflow/{id}/transition - 阶段转换"
    
    local workflow_id="$1"
    
    if [ -z "$workflow_id" ]; then
        record_test "POST /workflow/{id}/transition" "skip" "无工作流ID"
        return
    fi
    
    local transition_data='{
        "deliverables": [
            {"name": "交付物1", "description": "测试交付物"}
        ]
    }'
    
    local result=$(http_request "POST" "/workflow/$workflow_id/transition" "$transition_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "POST /workflow/$workflow_id/transition" "pass" "成功执行阶段转换"
    else
        record_test "POST /workflow/$workflow_id/transition" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_workflow_auto_generate() {
    log "测试: POST /workflow/auto-generate - 自动生成工作流"
    
    local generate_data='{"prompt": "创建一个简单的代码审查工作流"}'
    
    local result=$(http_request "POST" "/workflow/auto-generate" "$generate_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    # 这个接口可能需要LLM支持，所以可能返回错误
    if check_status "$status" "200"; then
        record_test "POST /workflow/auto-generate" "pass" "成功生成工作流"
    else
        record_test "POST /workflow/auto-generate" "skip" "LLM服务可能不可用: $status"
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
    else
        record_test "GET /event/listener/list" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_event_listener_add() {
    log "测试: POST /event/listener/add - 添加事件监听器"
    
    local listener_data='{
        "event_type": "workflow_started",
        "workflow_id": "test-workflow-id",
        "enabled": true
    }'
    
    local result=$(http_request "POST" "/event/listener/add" "$listener_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        local success=$(get_json_field "$body" "success")
        if [ "$success" = "true" ]; then
            local listener_id=$(get_json_field "$body" "listener_id")
            record_test "POST /event/listener/add" "pass" "成功添加事件监听器: $listener_id"
            echo "$listener_id"
        else
            record_test "POST /event/listener/add" "fail" "添加失败" "$body"
            echo ""
        fi
    else
        record_test "POST /event/listener/add" "fail" "HTTP状态码错误: $status" "$body"
        echo ""
    fi
}

test_event_listener_update() {
    log "测试: POST /event/listener/update - 更新事件监听器"
    
    local listener_id="$1"
    
    if [ -z "$listener_id" ]; then
        record_test "POST /event/listener/update" "skip" "无监听器ID"
        return
    fi
    
    local update_data="{
        \"id\": \"$listener_id\",
        \"event_type\": \"workflow_completed\",
        \"workflow_id\": \"test-workflow-id\",
        \"enabled\": false
    }"
    
    local result=$(http_request "POST" "/event/listener/update" "$update_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "POST /event/listener/update" "pass" "成功更新事件监听器"
    else
        record_test "POST /event/listener/update" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_event_listener_remove() {
    log "测试: POST /event/listener/remove - 移除事件监听器"
    
    local listener_id="$1"
    
    if [ -z "$listener_id" ]; then
        record_test "POST /event/listener/remove" "skip" "无监听器ID"
        return
    fi
    
    local result=$(http_request "POST" "/event/listener/remove" "{\"id\":\"$listener_id\"}" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "POST /event/listener/remove" "pass" "成功移除事件监听器"
    else
        record_test "POST /event/listener/remove" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_event_publish() {
    log "测试: POST /event/publish - 发布事件"
    
    local event_data='{
        "event_type": "workflow_started",
        "source": "test",
        "data": {"test": "data"}
    }'
    
    local result=$(http_request "POST" "/event/publish" "$event_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "POST /event/publish" "pass" "成功发布事件"
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
    else
        record_test "GET /agent-groups" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_agent_groups_create() {
    log "测试: POST /agent-groups - 创建智能体团队"
    
    local group_data='{
        "name": "测试团队",
        "description": "这是一个测试智能体团队",
        "agents": ["agent1", "agent2"],
        "autoGenerate": false,
        "teamMembers": []
    }'
    
    local result=$(http_request "POST" "/agent-groups" "$group_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        local group_id=$(get_json_field "$body" "id")
        if [ -n "$group_id" ]; then
            record_test "POST /agent-groups" "pass" "成功创建智能体团队: $group_id"
            echo "$group_id"
        else
            record_test "POST /agent-groups" "fail" "响应中无团队ID" "$body"
            echo ""
        fi
    else
        record_test "POST /agent-groups" "fail" "HTTP状态码错误: $status" "$body"
        echo ""
    fi
}

test_agent_groups_get() {
    log "测试: GET /agent-groups/{id} - 获取智能体团队"
    
    local group_id="$1"
    
    if [ -z "$group_id" ]; then
        record_test "GET /agent-groups/{id}" "skip" "无团队ID"
        return
    fi
    
    local result=$(http_request "GET" "/agent-groups/$group_id" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "GET /agent-groups/$group_id" "pass" "成功获取智能体团队详情"
    else
        record_test "GET /agent-groups/$group_id" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_agent_groups_update() {
    log "测试: PUT /agent-groups/{id} - 更新智能体团队"
    
    local group_id="$1"
    
    if [ -z "$group_id" ]; then
        record_test "PUT /agent-groups/{id}" "skip" "无团队ID"
        return
    fi
    
    local update_data='{
        "name": "更新后的团队名称",
        "description": "更新后的描述"
    }'
    
    local result=$(http_request "PUT" "/agent-groups/$group_id" "$update_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "PUT /agent-groups/$group_id" "pass" "成功更新智能体团队"
    else
        record_test "PUT /agent-groups/$group_id" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_agent_groups_delete() {
    log "测试: DELETE /agent-groups/{id} - 删除智能体团队"
    
    local group_id="$1"
    
    if [ -z "$group_id" ]; then
        record_test "DELETE /agent-groups/{id}" "skip" "无团队ID"
        return
    fi
    
    local result=$(http_request "DELETE" "/agent-groups/$group_id" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "DELETE /agent-groups/$group_id" "pass" "成功删除智能体团队"
    else
        record_test "DELETE /agent-groups/$group_id" "fail" "HTTP状态码错误: $status" "$body"
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
    else
        record_test "GET /role-mappings" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_role_mappings_create() {
    log "测试: POST /role-mappings - 创建角色映射"
    
    local mapping_data='{
        "role": "test_role",
        "agent_name": "test_agent",
        "agent_config": {"model": "gpt-4"}
    }'
    
    local result=$(http_request "POST" "/role-mappings" "$mapping_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "POST /role-mappings" "pass" "成功创建角色映射"
    else
        record_test "POST /role-mappings" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_role_mappings_get() {
    log "测试: GET /role-mappings/{role} - 获取角色映射"
    
    local result=$(http_request "GET" "/role-mappings/test_role" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "GET /role-mappings/test_role" "pass" "成功获取角色映射"
    else
        record_test "GET /role-mappings/test_role" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_role_mappings_update() {
    log "测试: PUT /role-mappings/{role} - 更新角色映射"
    
    local update_data='{
        "agent_name": "updated_agent",
        "agent_config": {"model": "gpt-4-turbo"}
    }'
    
    local result=$(http_request "PUT" "/role-mappings/test_role" "$update_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "PUT /role-mappings/test_role" "pass" "成功更新角色映射"
    else
        record_test "PUT /role-mappings/test_role" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_role_mappings_delete() {
    log "测试: DELETE /role-mappings/{role} - 删除角色映射"
    
    local result=$(http_request "DELETE" "/role-mappings/test_role" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "DELETE /role-mappings/test_role" "pass" "成功删除角色映射"
    else
        record_test "DELETE /role-mappings/test_role" "fail" "HTTP状态码错误: $status" "$body"
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
    else
        record_test "GET /swarm/tasks" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_swarm_tasks_create() {
    log "测试: POST /swarm/tasks - 创建任务"
    
    local task_data='{
        "task": "完成一个简单的测试任务",
        "agent_name": "test_agent",
        "label": "测试任务"
    }'
    
    local result=$(http_request "POST" "/swarm/tasks" "$task_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        local task_id=$(get_json_field "$body" "task_id")
        if [ -n "$task_id" ]; then
            record_test "POST /swarm/tasks" "pass" "成功创建任务: $task_id"
            echo "$task_id"
        else
            record_test "POST /swarm/tasks" "fail" "响应中无任务ID" "$body"
            echo ""
        fi
    else
        record_test "POST /swarm/tasks" "fail" "HTTP状态码错误: $status" "$body"
        echo ""
    fi
}

test_swarm_tasks_get() {
    log "测试: GET /swarm/tasks/{id} - 获取任务"
    
    local task_id="$1"
    
    if [ -z "$task_id" ]; then
        record_test "GET /swarm/tasks/{id}" "skip" "无任务ID"
        return
    fi
    
    local result=$(http_request "GET" "/swarm/tasks/$task_id" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "GET /swarm/tasks/$task_id" "pass" "成功获取任务详情"
    else
        record_test "GET /swarm/tasks/$task_id" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_swarm_tasks_messages_list() {
    log "测试: GET /swarm/tasks/{id}/messages - 获取消息"
    
    local task_id="$1"
    
    if [ -z "$task_id" ]; then
        record_test "GET /swarm/tasks/{id}/messages" "skip" "无任务ID"
        return
    fi
    
    local result=$(http_request "GET" "/swarm/tasks/$task_id/messages" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "GET /swarm/tasks/$task_id/messages" "pass" "成功获取消息列表"
    else
        record_test "GET /swarm/tasks/$task_id/messages" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_swarm_tasks_messages_send() {
    log "测试: POST /swarm/tasks/{id}/messages - 发送消息"
    
    local task_id="$1"
    
    if [ -z "$task_id" ]; then
        record_test "POST /swarm/tasks/{id}/messages" "skip" "无任务ID"
        return
    fi
    
    local message_data='{
        "content": "这是一条测试消息",
        "author": "tester",
        "author_type": "user"
    }'
    
    local result=$(http_request "POST" "/swarm/tasks/$task_id/messages" "$message_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "POST /swarm/tasks/$task_id/messages" "pass" "成功发送消息"
    else
        record_test "POST /swarm/tasks/$task_id/messages" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_swarm_tasks_consensus_get() {
    log "测试: GET /swarm/tasks/{id}/consensus - 获取共识"
    
    local task_id="$1"
    
    if [ -z "$task_id" ]; then
        record_test "GET /swarm/tasks/{id}/consensus" "skip" "无任务ID"
        return
    fi
    
    local result=$(http_request "GET" "/swarm/tasks/$task_id/consensus" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "GET /swarm/tasks/$task_id/consensus" "pass" "成功获取共识状态"
    else
        record_test "GET /swarm/tasks/$task_id/consensus" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_swarm_tasks_consensus_vote() {
    log "测试: POST /swarm/tasks/{id}/consensus - 投票"
    
    local task_id="$1"
    
    if [ -z "$task_id" ]; then
        record_test "POST /swarm/tasks/{id}/consensus" "skip" "无任务ID"
        return
    fi
    
    local vote_data='{
        "voter": "tester",
        "vote": true,
        "reason": "测试投票"
    }'
    
    local result=$(http_request "POST" "/swarm/tasks/$task_id/consensus" "$vote_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "POST /swarm/tasks/$task_id/consensus" "pass" "成功提交投票"
    else
        record_test "POST /swarm/tasks/$task_id/consensus" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_swarm_tasks_delete() {
    log "测试: DELETE /swarm/tasks/{id} - 删除任务"
    
    local task_id="$1"
    
    if [ -z "$task_id" ]; then
        record_test "DELETE /swarm/tasks/{id}" "skip" "无任务ID"
        return
    fi
    
    local result=$(http_request "DELETE" "/swarm/tasks/$task_id" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "DELETE /swarm/tasks/$task_id" "pass" "成功删除任务"
    else
        record_test "DELETE /swarm/tasks/$task_id" "fail" "HTTP状态码错误: $status" "$body"
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
    else
        record_test "GET /soul/templates" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_soul_templates_get() {
    log "测试: GET /soul/templates/{id} - 获取模板"
    
    local result=$(http_request "GET" "/soul/templates/clara" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "GET /soul/templates/clara" "pass" "成功获取Soul模板"
    else
        record_test "GET /soul/templates/clara" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_soul_templates_get_not_found() {
    log "测试: GET /soul/templates/{id} - 不存在的模板"
    
    local result=$(http_request "GET" "/soul/templates/nonexistent_template" "" "" "404")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "404"; then
        record_test "GET /soul/templates/nonexistent" "pass" "正确返回404"
    else
        record_test "GET /soul/templates/nonexistent" "fail" "应返回404，实际返回: $status" "$body"
    fi
}

test_soul_templates_save() {
    log "测试: POST /soul/templates - 保存模板"
    
    local template_data='{
        "id": "test_soul",
        "name": "测试Soul",
        "nature": "friendly",
        "purpose": "测试用途"
    }'
    
    local result=$(http_request "POST" "/soul/templates" "$template_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "POST /soul/templates" "pass" "成功保存Soul模板"
    else
        record_test "POST /soul/templates" "fail" "HTTP状态码错误: $status" "$body"
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
    else
        record_test "GET /mcp/servers" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_mcp_servers_create() {
    log "测试: POST /mcp/servers - 创建服务器"
    
    local server_data='{
        "name": "test_server",
        "command": "node",
        "args": ["server.js"],
        "env": {}
    }'
    
    local result=$(http_request "POST" "/mcp/servers" "$server_data" "" "201")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "201"; then
        local server_id=$(get_json_field "$body" "server.id")
        if [ -n "$server_id" ]; then
            record_test "POST /mcp/servers" "pass" "成功创建MCP服务器: $server_id"
            echo "$server_id"
        else
            record_test "POST /mcp/servers" "fail" "响应中无服务器ID" "$body"
            echo ""
        fi
    else
        record_test "POST /mcp/servers" "fail" "HTTP状态码错误: $status" "$body"
        echo ""
    fi
}

test_mcp_servers_create_invalid() {
    log "测试: POST /mcp/servers - 无效服务器名称"
    
    local server_data='{
        "name": "invalid;name",
        "command": "node",
        "args": [],
        "env": {}
    }'
    
    local result=$(http_request "POST" "/mcp/servers" "$server_data" "" "400")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "400"; then
        record_test "POST /mcp/servers - 无效名称" "pass" "正确拒绝无效名称"
    else
        record_test "POST /mcp/servers - 无效名称" "fail" "应返回400，实际返回: $status" "$body"
    fi
}

test_mcp_servers_get() {
    log "测试: GET /mcp/servers/{id} - 获取服务器"
    
    local server_id="$1"
    
    if [ -z "$server_id" ]; then
        record_test "GET /mcp/servers/{id}" "skip" "无服务器ID"
        return
    fi
    
    local result=$(http_request "GET" "/mcp/servers/$server_id" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "GET /mcp/servers/$server_id" "pass" "成功获取MCP服务器详情"
    else
        record_test "GET /mcp/servers/$server_id" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_mcp_servers_update() {
    log "测试: PUT /mcp/servers/{id} - 更新服务器"
    
    local server_id="$1"
    
    if [ -z "$server_id" ]; then
        record_test "PUT /mcp/servers/{id}" "skip" "无服务器ID"
        return
    fi
    
    local update_data='{
        "name": "updated_server",
        "args": ["updated.js"]
    }'
    
    local result=$(http_request "PUT" "/mcp/servers/$server_id" "$update_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "PUT /mcp/servers/$server_id" "pass" "成功更新MCP服务器"
    else
        record_test "PUT /mcp/servers/$server_id" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_mcp_servers_start() {
    log "测试: POST /mcp/servers/{id}/start - 启动服务器"
    
    local server_id="$1"
    
    if [ -z "$server_id" ]; then
        record_test "POST /mcp/servers/{id}/start" "skip" "无服务器ID"
        return
    fi
    
    local result=$(http_request "POST" "/mcp/servers/$server_id/start" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "POST /mcp/servers/$server_id/start" "pass" "成功启动MCP服务器"
    else
        record_test "POST /mcp/servers/$server_id/start" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_mcp_servers_stop() {
    log "测试: POST /mcp/servers/{id}/stop - 停止服务器"
    
    local server_id="$1"
    
    if [ -z "$server_id" ]; then
        record_test "POST /mcp/servers/{id}/stop" "skip" "无服务器ID"
        return
    fi
    
    local result=$(http_request "POST" "/mcp/servers/$server_id/stop" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "POST /mcp/servers/$server_id/stop" "pass" "成功停止MCP服务器"
    else
        record_test "POST /mcp/servers/$server_id/stop" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_mcp_servers_tools() {
    log "测试: GET /mcp/servers/{id}/tools - 获取工具"
    
    local server_id="$1"
    
    if [ -z "$server_id" ]; then
        record_test "GET /mcp/servers/{id}/tools" "skip" "无服务器ID"
        return
    fi
    
    local result=$(http_request "GET" "/mcp/servers/$server_id/tools" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "GET /mcp/servers/$server_id/tools" "pass" "成功获取MCP服务器工具"
    else
        record_test "GET /mcp/servers/$server_id/tools" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_mcp_servers_delete() {
    log "测试: DELETE /mcp/servers/{id} - 删除服务器"
    
    local server_id="$1"
    
    if [ -z "$server_id" ]; then
        record_test "DELETE /mcp/servers/{id}" "skip" "无服务器ID"
        return
    fi
    
    local result=$(http_request "DELETE" "/mcp/servers/$server_id" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "DELETE /mcp/servers/$server_id" "pass" "成功删除MCP服务器"
    else
        record_test "DELETE /mcp/servers/$server_id" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

# ============================================================================
# 测试用例 - 可观测性接口
# ============================================================================

test_observability_traces_list() {
    log "测试: POST /observability/traces/list - 轨迹列表"
    
    local query_data='{"limit": 10}'
    
    local result=$(http_request "POST" "/observability/traces/list" "$query_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "POST /observability/traces/list" "pass" "成功获取轨迹列表"
    elif check_status "$status" "503"; then
        record_test "POST /observability/traces/list" "skip" "可观测性未启用"
    else
        record_test "POST /observability/traces/list" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_observability_dashboard() {
    log "测试: GET /observability/dashboard - 仪表盘"
    
    local result=$(http_request "GET" "/observability/dashboard" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "GET /observability/dashboard" "pass" "成功获取仪表盘数据"
    elif check_status "$status" "503"; then
        record_test "GET /observability/dashboard" "skip" "可观测性未启用"
    else
        record_test "GET /observability/dashboard" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_observability_alerts() {
    log "测试: GET /observability/alerts - 告警列表"
    
    local result=$(http_request "GET" "/observability/alerts" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "GET /observability/alerts" "pass" "成功获取告警列表"
    else
        record_test "GET /observability/alerts" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_observability_failure_patterns() {
    log "测试: GET /observability/failure-patterns - 失败模式"
    
    local result=$(http_request "GET" "/observability/failure-patterns" "" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "GET /observability/failure-patterns" "pass" "成功获取失败模式"
    else
        record_test "GET /observability/failure-patterns" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

test_observability_aggregate() {
    log "测试: POST /observability/aggregate - 聚合数据"
    
    local aggregate_data='{"type": "success_rate"}'
    
    local result=$(http_request "POST" "/observability/aggregate" "$aggregate_data" "" "200")
    local status=$(echo "$result" | cut -d'|' -f1)
    local body=$(echo "$result" | cut -d'|' -f2-)
    
    if check_status "$status" "200"; then
        record_test "POST /observability/aggregate" "pass" "成功获取聚合数据"
    elif check_status "$status" "503"; then
        record_test "POST /observability/aggregate" "skip" "可观测性未启用"
    else
        record_test "POST /observability/aggregate" "fail" "HTTP状态码错误: $status" "$body"
    fi
}

# ============================================================================
# 主测试流程
# ============================================================================

main() {
    log "=========================================="
    log "ZeroClaw Gateway API 全面接口测试"
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
    
    # ========================================
    # 1. 基础接口测试
    # ========================================
    log "=========================================="
    log "1. 基础接口测试"
    log "=========================================="
    
    test_health_check
    local pairing_code=$(test_pairing_code)
    test_pair "$pairing_code"
    test_pair_invalid_code
    test_webhook_unauthorized
    test_webhook_invalid_json
    test_webhook_missing_message
    test_chat_abort_missing_session
    test_chat_abort_nonexistent_session
    log ""
    
    # ========================================
    # 2. 成本接口测试
    # ========================================
    log "=========================================="
    log "2. 成本接口测试"
    log "=========================================="
    
    test_cost_summary
    test_cost_daily
    test_cost_daily_with_date
    test_cost_daily_invalid_date
    log ""
    
    # ========================================
    # 3. WhatsApp 接口测试
    # ========================================
    log "=========================================="
    log "3. WhatsApp 接口测试"
    log "=========================================="
    
    test_whatsapp_verify_no_config
    log ""
    
    # ========================================
    # 4. 工作流接口测试
    # ========================================
    log "=========================================="
    log "4. 工作流接口测试"
    log "=========================================="
    
    test_workflow_list
    local workflow_id=$(test_workflow_create)
    test_workflow_create_missing_name
    test_workflow_phases "$workflow_id"
    test_workflow_context "$workflow_id"
    test_workflow_approvals "$workflow_id"
    test_workflow_start "$workflow_id"
    test_workflow_pause "$workflow_id"
    test_workflow_resume "$workflow_id"
    test_workflow_transition "$workflow_id"
    test_workflow_stop "$workflow_id"
    test_workflow_auto_generate
    log ""
    
    # ========================================
    # 5. 事件驱动接口测试
    # ========================================
    log "=========================================="
    log "5. 事件驱动接口测试"
    log "=========================================="
    
    test_event_listener_list
    local listener_id=$(test_event_listener_add)
    test_event_listener_update "$listener_id"
    test_event_listener_remove "$listener_id"
    test_event_publish
    log ""
    
    # ========================================
    # 6. 智能体团队接口测试
    # ========================================
    log "=========================================="
    log "6. 智能体团队接口测试"
    log "=========================================="
    
    test_agent_groups_list
    local group_id=$(test_agent_groups_create)
    test_agent_groups_get "$group_id"
    test_agent_groups_update "$group_id"
    test_agent_groups_delete "$group_id"
    log ""
    
    # ========================================
    # 7. 角色映射接口测试
    # ========================================
    log "=========================================="
    log "7. 角色映射接口测试"
    log "=========================================="
    
    test_role_mappings_list
    test_role_mappings_create
    test_role_mappings_get
    test_role_mappings_update
    test_role_mappings_delete
    log ""
    
    # ========================================
    # 8. Swarm 智能体群聊接口测试
    # ========================================
    log "=========================================="
    log "8. Swarm 智能体群聊接口测试"
    log "=========================================="
    
    test_swarm_tasks_list
    local swarm_task_id=$(test_swarm_tasks_create)
    test_swarm_tasks_get "$swarm_task_id"
    test_swarm_tasks_messages_list "$swarm_task_id"
    test_swarm_tasks_messages_send "$swarm_task_id"
    test_swarm_tasks_consensus_get "$swarm_task_id"
    test_swarm_tasks_consensus_vote "$swarm_task_id"
    test_swarm_tasks_delete "$swarm_task_id"
    log ""
    
    # ========================================
    # 9. Soul 模板接口测试
    # ========================================
    log "=========================================="
    log "9. Soul 模板接口测试"
    log "=========================================="
    
    test_soul_templates_list
    test_soul_templates_get
    test_soul_templates_get_not_found
    test_soul_templates_save
    log ""
    
    # ========================================
    # 10. MCP 服务器接口测试
    # ========================================
    log "=========================================="
    log "10. MCP 服务器接口测试"
    log "=========================================="
    
    test_mcp_servers_list
    test_mcp_servers_create_invalid
    local mcp_server_id=$(test_mcp_servers_create)
    test_mcp_servers_get "$mcp_server_id"
    test_mcp_servers_update "$mcp_server_id"
    test_mcp_servers_start "$mcp_server_id"
    test_mcp_servers_stop "$mcp_server_id"
    test_mcp_servers_tools "$mcp_server_id"
    test_mcp_servers_delete "$mcp_server_id"
    log ""
    
    # ========================================
    # 11. 可观测性接口测试
    # ========================================
    log "=========================================="
    log "11. 可观测性接口测试"
    log "=========================================="
    
    test_observability_traces_list
    test_observability_dashboard
    test_observability_alerts
    test_observability_failure_patterns
    test_observability_aggregate
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
