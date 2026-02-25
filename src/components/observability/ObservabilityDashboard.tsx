/**
 * 可观测性仪表板组件
 * 
 * 整合轨迹浏览器、推理链可视化、决策分析等组件
 * 提供完整的智能体运行监控界面
 */

import { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  Bell,
  BarChart2,
  GitBranch,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardStats, useAlerts, useTraceSubscription } from './hooks';
import { TraceBrowserView } from './TraceBrowserView';
import { ReasoningVisualization } from './ReasoningVisualization';
import { DecisionAnalysisPanel } from './DecisionAnalysisPanel';
import type {
  AgentTrace,
  TimeRange,
  DashboardStats,
  Alert,
  TrendDataPoint,
} from '@/types/global';

/**
 * 仪表板视图模式
 */
type ViewMode = 'overview' | 'traces' | 'analysis';

/**
 * 可观测性仪表板属性
 */
interface ObservabilityDashboardProps {
  className?: string;
}

/**
 * 可观测性仪表板主组件
 */
export const ObservabilityDashboard = memo(function ObservabilityDashboard({
  className,
}: ObservabilityDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);

  const { stats, loading: statsLoading, error: statsError, refresh: refreshStats } = useDashboardStats(timeRange);
  const { alerts, loading: alertsLoading, dismissAlert } = useAlerts(10);

  // 实时轨迹订阅
  const handleNewTrace = useCallback((trace: AgentTrace) => {
    // 新轨迹到达时刷新统计数据
    refreshStats();
  }, [refreshStats]);

  const { isSubscribed } = useTraceSubscription(handleNewTrace);

  // 处理轨迹选择
  const handleTraceSelect = useCallback((trace: AgentTrace) => {
    setSelectedTraceId(trace.id);
    setViewMode('analysis');
  }, []);

  // 未读告警数量
  const unreadAlertsCount = useMemo(() => {
    if (!Array.isArray(alerts)) return 0;
    return alerts.filter(a => a.severity === 'error' || a.severity === 'critical').length;
  }, [alerts]);

  return (
    <div className={cn("flex flex-col h-full bg-dark-950", className)}>
      {/* 顶部工具栏 */}
      <DashboardHeader
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        isSubscribed={isSubscribed}
        unreadAlertsCount={unreadAlertsCount}
        showAlerts={showAlerts}
        onShowAlertsChange={setShowAlerts}
        onRefresh={refreshStats}
        loading={statsLoading}
      />

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'overview' && (
          <OverviewView
            stats={stats}
            loading={statsLoading}
            error={statsError}
            alerts={alerts}
            onTraceSelect={handleTraceSelect}
            onViewModeChange={setViewMode}
          />
        )}

        {viewMode === 'traces' && (
          <TraceBrowserView
            onTraceSelect={handleTraceSelect}
            className="h-full"
          />
        )}

        {viewMode === 'analysis' && (
          <AnalysisView
            traceId={selectedTraceId}
            onBack={() => setViewMode('overview')}
          />
        )}
      </div>

      {/* 告警面板 */}
      {showAlerts && (
        <AlertsPanel
          alerts={alerts}
          loading={alertsLoading}
          onDismiss={dismissAlert}
          onClose={() => setShowAlerts(false)}
        />
      )}
    </div>
  );
});

/**
 * 仪表板头部属性
 */
interface DashboardHeaderProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  isSubscribed: boolean;
  unreadAlertsCount: number;
  showAlerts: boolean;
  onShowAlertsChange: (show: boolean) => void;
  onRefresh: () => void;
  loading: boolean;
}

/**
 * 仪表板头部组件
 */
const DashboardHeader = memo(function DashboardHeader({
  timeRange,
  onTimeRangeChange,
  isSubscribed,
  unreadAlertsCount,
  showAlerts,
  onShowAlertsChange,
  onRefresh,
  loading,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800 bg-dark-900">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
          <Activity size={20} />
          可观测性仪表板
        </h1>

        {/* 实时状态指示器 */}
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isSubscribed ? "bg-green-500 animate-pulse" : "bg-dark-500"
          )} />
          <span className="text-xs text-dark-400">
            {isSubscribed ? '实时监控中' : '离线'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* 时间范围选择 */}
        <TimeRangeSelector
          value={timeRange}
          onChange={onTimeRangeChange}
        />

        {/* 告警按钮 */}
        <Button
          size="sm"
          variant="ghost"
          className="relative"
          onClick={() => onShowAlertsChange(!showAlerts)}
        >
          <Bell size={16} />
          {unreadAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
              {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
            </span>
          )}
        </Button>

        {/* 刷新按钮 */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>
    </div>
  );
});

/**
 * 时间范围选择器属性
 */
interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

/**
 * 时间范围选择器
 */
const TimeRangeSelector = memo(function TimeRangeSelector({
  value,
  onChange,
}: TimeRangeSelectorProps) {
  const options: { value: TimeRange; label: string }[] = [
    { value: '1h', label: '1小时' },
    { value: '24h', label: '24小时' },
    { value: '7d', label: '7天' },
    { value: '30d', label: '30天' },
  ];

  return (
    <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-2 py-1 text-xs rounded transition-colors",
            value === option.value
              ? "bg-primary-600 text-white"
              : "text-dark-300 hover:text-dark-100"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
});

/**
 * 概览视图属性
 */
interface OverviewViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  alerts: Alert[];
  onTraceSelect: (trace: AgentTrace) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

/**
 * 概览视图
 */
const OverviewView = memo(function OverviewView({
  stats,
  loading,
  error,
  alerts,
  onTraceSelect,
  onViewModeChange,
}: OverviewViewProps) {
  if (loading && !stats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-dark-800 rounded-full" />
          <div className="w-32 h-4 bg-dark-800 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400">
        <div className="text-center">
          <AlertTriangle size={32} className="mx-auto mb-3" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex-1 flex items-center justify-center text-dark-400">
        <div className="text-center">
          <Activity size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">暂无数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="总轨迹数"
          value={(stats?.totalTraces ?? 0).toString()}
          trend={stats?.tracesTrend ?? 0}
          icon={<MessageSquare size={20} />}
          onClick={() => onViewModeChange('traces')}
        />
        <StatCard
          title="成功率"
          value={`${((stats?.successRate ?? 0) * 100).toFixed(1)}%`}
          trend={stats?.successRateTrend ?? 0}
          icon={<CheckCircle size={20} />}
          color="green"
        />
        <StatCard
          title="平均耗时"
          value={formatDuration(stats?.avgDurationMs ?? 0)}
          trend={stats?.durationTrend ?? 0}
          icon={<Clock size={20} />}
          invertTrend
        />
        <StatCard
          title="总成本"
          value={`$${(stats?.totalCost ?? 0).toFixed(2)}`}
          trend={stats?.costTrend ?? 0}
          icon={<DollarSign size={20} />}
          invertTrend
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 轨迹趋势图 */}
        <TrendChart
          title="轨迹趋势"
          data={stats?.traceTrend ?? []}
          valueFormatter={(v) => v.toString()}
        />

        {/* 成功率趋势图 */}
        <TrendChart
          title="成功率趋势"
          data={stats?.successRateTrendData ?? []}
          valueFormatter={(v) => `${(v * 100).toFixed(1)}%`}
          color="green"
        />
      </div>

      {/* 底部区域 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 决策质量分布 */}
        <DecisionQualityChart data={stats?.decisionQualityDistribution ?? []} />

        {/* 工具使用统计 */}
        <ToolUsageChart data={stats?.toolUsage ?? []} />

        {/* 失败模式 */}
        <FailurePatternsPanel patterns={stats?.failurePatterns ?? []} />
      </div>
    </div>
  );
});

/**
 * 统计卡片属性
 */
interface StatCardProps {
  title: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
  color?: 'default' | 'green' | 'red' | 'yellow';
  invertTrend?: boolean;
  onClick?: () => void;
}

/**
 * 统计卡片
 */
const StatCard = memo(function StatCard({
  title,
  value,
  trend,
  icon,
  color = 'default',
  invertTrend = false,
  onClick,
}: StatCardProps) {
  const trendValue = invertTrend ? -trend : trend;
  const trendColor = trendValue > 0
    ? 'text-green-400'
    : trendValue < 0
      ? 'text-red-400'
      : 'text-dark-400';
  const TrendIcon = trendValue > 0 ? TrendingUp : trendValue < 0 ? TrendingDown : Minus;

  const colorClasses = {
    default: 'bg-dark-800',
    green: 'bg-green-500/10 border-green-500/30',
    red: 'bg-red-500/10 border-red-500/30',
    yellow: 'bg-yellow-500/10 border-yellow-500/30',
  };

  return (
    <div
      className={cn(
        "rounded-lg p-4 border border-dark-700 transition-all",
        colorClasses[color],
        onClick && "cursor-pointer hover:border-dark-500"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-dark-400">{title}</span>
        <span className={cn("text-dark-400", color === 'green' && "text-green-400")}>
          {icon}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-semibold text-dark-100">{value}</span>
        <div className={cn("flex items-center gap-0.5 text-xs", trendColor)}>
          <TrendIcon size={12} />
          <span>{Math.abs(trendValue * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
});

/**
 * 趋势图属性
 */
interface TrendChartProps {
  title: string;
  data: TrendDataPoint[];
  valueFormatter: (value: number) => string;
  color?: 'default' | 'green' | 'red';
}

/**
 * 趋势图组件
 */
const TrendChart = memo(function TrendChart({
  title,
  data,
  valueFormatter,
  color = 'default',
}: TrendChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!chartRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);

  // 计算图表数据
  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const values = data.map(d => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    return {
      points: data.map((d, i) => ({
        x: (i / (data.length - 1)) * dimensions.width,
        y: dimensions.height - ((d.value - min) / range) * dimensions.height * 0.8 - dimensions.height * 0.1,
        value: d.value,
        time: d.time,
      })),
      max,
      min,
    };
  }, [data, dimensions]);

  const colorClass = color === 'green' ? '#22c55e' : color === 'red' ? '#ef4444' : '#6366f1';

  return (
    <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
      <h3 className="text-sm font-medium text-dark-200 mb-3">{title}</h3>
      <div
        ref={chartRef}
        className="h-32 relative"
      >
        {chartData && dimensions.width > 0 && (
          <svg
            width={dimensions.width}
            height={dimensions.height}
            className="absolute inset-0"
          >
            {/* 折线 */}
            <polyline
              points={chartData.points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={colorClass}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 渐变填充 */}
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorClass} stopOpacity="0.3" />
                <stop offset="100%" stopColor={colorClass} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon
              points={`0,${dimensions.height} ${chartData.points.map(p => `${p.x},${p.y}`).join(' ')} ${dimensions.width},${dimensions.height}`}
              fill={`url(#gradient-${title})`}
            />
          </svg>
        )}
        {(!chartData || data.length === 0) && (
          <div className="h-full flex items-center justify-center text-dark-500 text-xs">
            暂无数据
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * 决策质量图表属性
 */
interface DecisionQualityChartProps {
  data: Array<{ range: string; count: number }>;
}

/**
 * 决策质量分布图
 */
const DecisionQualityChart = memo(function DecisionQualityChart({ data }: DecisionQualityChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
      <h3 className="text-sm font-medium text-dark-200 mb-3 flex items-center gap-2">
        <BarChart2 size={14} />
        决策质量分布
      </h3>
      <div className="space-y-2">
        {data.length === 0 ? (
          <div className="text-xs text-dark-500 text-center py-4">暂无数据</div>
        ) : (
          data.map((item) => (
            <div key={item.range} className="flex items-center gap-2">
              <span className="text-xs text-dark-400 w-16">{item.range}</span>
              <div className="flex-1 h-4 bg-dark-700 rounded overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all"
                  style={{ width: `${(item.count / total) * 100}%` }}
                />
              </div>
              <span className="text-xs text-dark-300 w-8 text-right">{item.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

/**
 * 工具使用图表属性
 */
interface ToolUsageChartProps {
  data: Array<{ tool: string; count: number }>;
}

/**
 * 工具使用统计图
 */
const ToolUsageChart = memo(function ToolUsageChart({ data }: ToolUsageChartProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
      <h3 className="text-sm font-medium text-dark-200 mb-3 flex items-center gap-2">
        <Zap size={14} />
        工具使用统计
      </h3>
      <div className="space-y-2">
        {data.length === 0 ? (
          <div className="text-xs text-dark-500 text-center py-4">暂无数据</div>
        ) : (
          data.slice(0, 5).map((item) => (
            <div key={item.tool} className="flex items-center gap-2">
              <span className="text-xs text-dark-400 w-20 truncate">{item.tool}</span>
              <div className="flex-1 h-4 bg-dark-700 rounded overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-xs text-dark-300 w-8 text-right">{item.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

/**
 * 失败模式面板属性
 */
interface FailurePatternsPanelProps {
  patterns: Array<{
    patternId: string;
    description: string;
    frequency: number;
  }>;
}

/**
 * 失败模式面板
 */
const FailurePatternsPanel = memo(function FailurePatternsPanel({ patterns }: FailurePatternsPanelProps) {
  return (
    <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
      <h3 className="text-sm font-medium text-dark-200 mb-3 flex items-center gap-2">
        <AlertTriangle size={14} />
        失败模式
      </h3>
      <div className="space-y-2">
        {patterns.length === 0 ? (
          <div className="text-xs text-dark-500 text-center py-4">
            <CheckCircle size={20} className="mx-auto mb-1 text-green-400" />
            暂无失败模式
          </div>
        ) : (
          patterns.slice(0, 3).map((pattern) => (
            <div
              key={pattern.patternId}
              className="flex items-start gap-2 p-2 bg-dark-850 rounded"
            >
              <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-dark-200 truncate">{pattern.description}</p>
                <p className="text-xs text-dark-500">出现 {pattern.frequency} 次</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

/**
 * 分析视图属性
 */
interface AnalysisViewProps {
  traceId: string | null;
  onBack: () => void;
}

/**
 * 分析视图
 */
const AnalysisView = memo(function AnalysisView({ traceId, onBack }: AnalysisViewProps) {
  return (
    <div className="h-full flex">
      {/* 左侧：轨迹浏览器 */}
      <div className="w-80 border-r border-dark-700">
        <TraceBrowserView className="h-full" />
      </div>

      {/* 右侧：分析面板 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Button size="sm" variant="ghost" onClick={onBack}>
            返回概览
          </Button>
        </div>

        {/* 推理链可视化 */}
        <div>
          <h3 className="text-sm font-medium text-dark-200 mb-2 flex items-center gap-2">
            <GitBranch size={14} />
            推理过程
          </h3>
          {/* 推理链需要从轨迹数据获取，这里使用占位 */}
          <div className="bg-dark-800 rounded-lg p-4 text-dark-400 text-sm">
            选择一条包含推理链的轨迹查看详细推理过程
          </div>
        </div>

        {/* 决策分析 */}
        <DecisionAnalysisPanel traceId={traceId} />
      </div>
    </div>
  );
});

/**
 * 告警面板属性
 */
interface AlertsPanelProps {
  alerts: Alert[];
  loading: boolean;
  onDismiss: (id: string) => void;
  onClose: () => void;
}

/**
 * 告警面板
 */
const AlertsPanel = memo(function AlertsPanel({
  alerts,
  loading,
  onDismiss,
  onClose,
}: AlertsPanelProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-900 rounded-lg w-96 max-h-[80vh] overflow-hidden border border-dark-700">
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h3 className="text-sm font-medium text-dark-200 flex items-center gap-2">
            <Bell size={16} />
            告警通知
          </h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="overflow-y-auto max-h-96">
          {loading ? (
            <div className="p-4 text-center text-dark-400">
              加载中...
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-4 text-center text-dark-400">
              <CheckCircle size={24} className="mx-auto mb-2 text-green-400" />
              暂无告警
            </div>
          ) : (
            <div className="divide-y divide-dark-800">
              {alerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onDismiss={() => onDismiss(alert.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * 告警项属性
 */
interface AlertItemProps {
  alert: Alert;
  onDismiss: () => void;
}

/**
 * 告警项
 */
const AlertItem = memo(function AlertItem({ alert, onDismiss }: AlertItemProps) {
  const severityColors = {
    info: 'border-blue-500/30 bg-blue-500/10',
    warning: 'border-yellow-500/30 bg-yellow-500/10',
    error: 'border-red-500/30 bg-red-500/10',
    critical: 'border-red-500/50 bg-red-500/20',
  };

  const severityBadgeColors = {
    info: 'text-blue-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    critical: 'text-red-400 bg-red-400/20',
  };

  return (
    <div className={cn("p-3 border-l-2", severityColors[alert.severity])}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn("text-xs", severityBadgeColors[alert.severity])}>
              {alert.severity}
            </Badge>
            <span className="text-xs text-dark-500">
              {formatTimestamp(alert.timestamp)}
            </span>
          </div>
          <p className="text-sm font-medium text-dark-100">{alert.title}</p>
          <p className="text-xs text-dark-400 mt-1">{alert.description}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onDismiss} className="shrink-0">
          ×
        </Button>
      </div>
    </div>
  );
});

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
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

export default ObservabilityDashboard;
