/**
 * 轨迹浏览器视图
 * 
 * 提供轨迹列表、搜索、筛选和详情查看功能
 */

import { useState, useCallback, useMemo, memo } from 'react';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  MessageSquare,
  Bot,
  Wrench,
  GitBranch,
  AlertCircle,
  Clock,
  ChevronRight,
  Loader2,
  HelpCircle,
  LucideIcon,
  CheckCircle,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { useTraces, useTrace } from './hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AgentTrace, TraceType, TraceQuery } from '@/types/global';

/**
 * 轨迹浏览器属性
 */
interface TraceBrowserViewProps {
  initialQuery?: TraceQuery;
  onTraceSelect?: (trace: AgentTrace) => void;
  className?: string;
}

/**
 * 轨迹浏览器主视图
 */
export const TraceBrowserView = memo(function TraceBrowserView({
  initialQuery,
  onTraceSelect,
  className,
}: TraceBrowserViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TraceQuery>(initialQuery || {});
  
  const { traces, loading, error, hasMore, search, loadMore, refresh } = useTraces(filters);
  const { trace: selectedTrace } = useTrace(selectedId);

  const handleSelect = useCallback((trace: AgentTrace) => {
    setSelectedId(trace.id);
    onTraceSelect?.(trace);
  }, [onTraceSelect]);

  const handleSearch = useCallback(() => {
    search(filters);
  }, [search, filters]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  return (
    <div className={cn("flex h-full", className)}>
      {/* 左侧：轨迹列表 */}
      <div className="w-80 border-r border-dark-700 flex flex-col">
        {/* 搜索栏 */}
        <div className="p-3 border-b border-dark-700 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400"
              />
              <Input
                placeholder="搜索轨迹..."
                value={filters.text || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, text: e.target.value }))}
                onKeyPress={handleKeyPress}
                className="pl-9 h-8 text-sm"
              />
            </div>
            <Button size="sm" onClick={handleSearch}>
              搜索
            </Button>
          </div>
          
          {/* 快速筛选 */}
          <div className="flex gap-1 flex-wrap">
            <FilterChip
              label="LLM 调用"
              active={filters.traceType === 'llm_call'}
              onClick={() => setFilters(prev => ({
                ...prev,
                traceType: prev.traceType === 'llm_call' ? undefined : 'llm_call'
              }))}
            />
            <FilterChip
              label="工具调用"
              active={filters.traceType === 'tool_call'}
              onClick={() => setFilters(prev => ({
                ...prev,
                traceType: prev.traceType === 'tool_call' ? undefined : 'tool_call'
              }))}
            />
            <FilterChip
              label="错误"
              active={filters.success === false}
              onClick={() => setFilters(prev => ({
                ...prev,
                success: prev.success === false ? undefined : false
              }))}
            />
          </div>
        </div>

        {/* 轨迹列表 */}
        <div className="flex-1 overflow-y-auto">
          {loading && traces.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={24} className="animate-spin text-dark-400" />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-400">
              <AlertCircle size={24} className="mx-auto mb-2" />
              <p className="text-sm">{error}</p>
              <Button size="sm" variant="ghost" onClick={refresh} className="mt-2">
                重试
              </Button>
            </div>
          ) : traces.length === 0 ? (
            <div className="p-4 text-center text-dark-400">
              <MessageSquare size={24} className="mx-auto mb-2" />
              <p className="text-sm">暂无轨迹数据</p>
            </div>
          ) : (
            <>
              {traces.map((trace) => (
                <TraceListItem
                  key={trace.id}
                  trace={trace}
                  isSelected={trace.id === selectedId}
                  onClick={() => handleSelect(trace)}
                />
              ))}
              
              {hasMore && (
                <div className="p-3 text-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin mr-2" />
                    ) : null}
                    加载更多
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部工具栏 */}
        <div className="p-2 border-t border-dark-700 flex justify-between items-center">
          <span className="text-xs text-dark-400">
            共 {traces.length} 条轨迹
          </span>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* 右侧：轨迹详情 */}
      <div className="flex-1 overflow-y-auto">
        {selectedTrace ? (
          <TraceDetailPanel trace={selectedTrace} />
        ) : (
          <div className="h-full flex items-center justify-center text-dark-400">
            <div className="text-center">
              <ChevronRight size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">选择一条轨迹查看详情</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * 轨迹列表项
 */
interface TraceListItemProps {
  trace: AgentTrace;
  isSelected: boolean;
  onClick: () => void;
}

const TraceListItem = memo(function TraceListItem({
  trace,
  isSelected,
  onClick,
}: TraceListItemProps) {
  const typeInfo = getTraceTypeInfo(trace?.traceType);
  
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 border-b border-dark-800 cursor-pointer transition-colors",
        isSelected ? "bg-dark-800 border-l-2 border-l-primary-500" : "hover:bg-dark-850"
      )}
      onClick={onClick}
    >
      {/* 类型图标 */}
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
        typeInfo.bgColor
      )}>
        <typeInfo.icon size={16} className={typeInfo.iconColor} />
      </div>
      
      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate text-dark-100">
          {typeInfo.label}
        </div>
        <div className="text-xs text-dark-400 truncate">
          {trace.input.content.slice(0, 50)}...
        </div>
      </div>
      
      {/* 状态和元数据 */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge
          variant={trace.output.success ? "success" : "destructive"}
          className="text-xs"
        >
          {trace.output.success ? '成功' : '失败'}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-dark-500">
          <Clock size={10} />
          {formatDuration(trace.durationMs)}
        </div>
      </div>
    </div>
  );
});

/**
 * 轨迹详情面板
 */
interface TraceDetailPanelProps {
  trace: AgentTrace;
}

const TraceDetailPanel = memo(function TraceDetailPanel({ trace }: TraceDetailPanelProps) {
  return (
    <div className="p-4 space-y-4">
      {/* 基本信息 */}
      <div className="bg-dark-800 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3 text-dark-200">基本信息</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-dark-400">ID:</span>
            <span className="ml-2 text-dark-200 font-mono text-xs">{trace.id}</span>
          </div>
          <div>
            <span className="text-dark-400">运行 ID:</span>
            <span className="ml-2 text-dark-200 font-mono text-xs">{trace.runId}</span>
          </div>
          <div>
            <span className="text-dark-400">时间:</span>
            <span className="ml-2 text-dark-200">{formatTimestamp(trace.timestamp)}</span>
          </div>
          <div>
            <span className="text-dark-400">耗时:</span>
            <span className="ml-2 text-dark-200">{formatDuration(trace.durationMs)}</span>
          </div>
        </div>
      </div>

      {/* 输入 */}
      <div className="bg-dark-800 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3 text-dark-200">输入</h3>
        <pre className="text-xs text-dark-300 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
          {trace.input.content}
        </pre>
      </div>

      {/* 输出 */}
      <div className="bg-dark-800 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3 text-dark-200">
          输出
          {trace.output.success ? (
            <Badge variant="success" className="ml-2">成功</Badge>
          ) : (
            <Badge variant="destructive" className="ml-2">失败</Badge>
          )}
        </h3>
        {trace.output.error ? (
          <div className="text-red-400 text-sm">{trace.output.error}</div>
        ) : (
          <pre className="text-xs text-dark-300 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
            {trace.output.content}
          </pre>
        )}
      </div>

      {/* Token 使用量 */}
      {trace.output.tokensUsed && (
        <div className="bg-dark-800 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3 text-dark-200">Token 使用量</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-dark-400">Prompt:</span>
              <span className="ml-2 text-dark-200">{trace.output.tokensUsed.promptTokens}</span>
            </div>
            <div>
              <span className="text-dark-400">Completion:</span>
              <span className="ml-2 text-dark-200">{trace.output.tokensUsed.completionTokens}</span>
            </div>
            <div>
              <span className="text-dark-400">总计:</span>
              <span className="ml-2 text-dark-200">{trace.output.tokensUsed.totalTokens}</span>
            </div>
          </div>
          {trace.output.costUsd !== undefined && (
            <div className="mt-2 text-sm">
              <span className="text-dark-400">成本:</span>
              <span className="ml-2 text-dark-200">${trace.output.costUsd.toFixed(4)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * 筛选按钮
 */
interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const FilterChip = memo(function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2 py-0.5 text-xs rounded transition-colors",
        active
          ? "bg-primary-600 text-white"
          : "bg-dark-700 text-dark-300 hover:bg-dark-600"
      )}
    >
      {label}
    </button>
  );
});

/**
 * 获取轨迹类型信息
 */
function getTraceTypeInfo(type?: TraceType): {
  label: string;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
} {
  if (!type || !type.type) {
    return {
      label: '未知类型',
      icon: HelpCircle,
      bgColor: 'bg-gray-600/20',
      iconColor: 'text-gray-400',
    };
  }
  
  switch (type.type) {
    case 'user_message':
      return {
        label: '用户消息',
        icon: MessageSquare,
        bgColor: 'bg-blue-600/20',
        iconColor: 'text-blue-400',
      };
    case 'llm_call':
      return {
        label: `${type.provider} / ${type.model}`,
        icon: Bot,
        bgColor: 'bg-purple-600/20',
        iconColor: 'text-purple-400',
      };
    case 'tool_call':
      return {
        label: `${type.tool}.${type.action}`,
        icon: Wrench,
        bgColor: 'bg-green-600/20',
        iconColor: 'text-green-400',
      };
    case 'sub_agent_call':
      return {
        label: type.agentName || '子智能体调用',
        icon: Bot,
        bgColor: 'bg-indigo-600/20',
        iconColor: 'text-indigo-400',
      };
    case 'phase_transition':
      return {
        label: '阶段转换',
        icon: GitBranch,
        bgColor: 'bg-yellow-600/20',
        iconColor: 'text-yellow-400',
      };
    case 'approval_request':
      return {
        label: '审批请求',
        icon: CheckCircle,
        bgColor: 'bg-orange-600/20',
        iconColor: 'text-orange-400',
      };
    case 'system_event':
      return {
        label: '系统事件',
        icon: Settings,
        bgColor: 'bg-gray-600/20',
        iconColor: 'text-gray-400',
      };
    case 'error':
      return {
        label: '错误',
        icon: AlertTriangle,
        bgColor: 'bg-red-600/20',
        iconColor: 'text-red-400',
      };
    default:
      return {
        label: '未知类型',
        icon: HelpCircle,
        bgColor: 'bg-gray-600/20',
        iconColor: 'text-gray-400',
      };
  }
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 格式化持续时间
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default TraceBrowserView;
