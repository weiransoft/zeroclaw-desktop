/**
 * 决策分析面板组件
 * 
 * 展示智能体的决策过程，包括备选方案、选择理由和质量评估
 */

import { useState, useMemo, memo, useCallback } from 'react';
import {
  GitBranch,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  BarChart2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDecisions } from './hooks';
import type { DecisionPoint, DecisionAlternative, DecisionType, DecisionQuality } from '@/types/global';

/**
 * 决策分析面板属性
 */
interface DecisionAnalysisPanelProps {
  traceId: string | null;
  onDecisionClick?: (decision: DecisionPoint) => void;
  className?: string;
}

/**
 * 决策分析面板主组件
 */
export const DecisionAnalysisPanel = memo(function DecisionAnalysisPanel({
  traceId,
  onDecisionClick,
  className,
}: DecisionAnalysisPanelProps) {
  const { decisions, loading, error } = useDecisions(traceId);

  if (!traceId) {
    return (
      <div className={cn("bg-dark-900 rounded-lg p-6 text-center text-dark-400", className)}>
        <GitBranch size={32} className="mx-auto mb-3 opacity-50" />
        <p className="text-sm">选择一条轨迹查看决策分析</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("bg-dark-900 rounded-lg p-6 text-center", className)}>
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="w-8 h-8 bg-dark-700 rounded-full" />
          <div className="w-24 h-4 bg-dark-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("bg-dark-900 rounded-lg p-6 text-center text-red-400", className)}>
        <AlertTriangle size={24} className="mx-auto mb-2" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (decisions.length === 0) {
    return (
      <div className={cn("bg-dark-900 rounded-lg p-6 text-center text-dark-400", className)}>
        <Target size={32} className="mx-auto mb-3 opacity-50" />
        <p className="text-sm">该轨迹没有决策点记录</p>
      </div>
    );
  }

  return (
    <div className={cn("bg-dark-900 rounded-lg p-4 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-dark-200 flex items-center gap-2">
          <GitBranch size={16} />
          决策分析
        </h3>
        <Badge variant="secondary" className="text-xs">
          {decisions.length} 个决策
        </Badge>
      </div>

      <div className="space-y-3">
        {decisions.map((decision, index) => (
          <DecisionCard
            key={decision.id}
            decision={decision}
            index={index + 1}
            onClick={() => onDecisionClick?.(decision)}
          />
        ))}
      </div>
    </div>
  );
});

/**
 * 决策卡片属性
 */
interface DecisionCardProps {
  decision: DecisionPoint;
  index: number;
  onClick?: () => void;
}

/**
 * 单个决策卡片
 */
const DecisionCard = memo(function DecisionCard({
  decision,
  index,
  onClick,
}: DecisionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = getDecisionTypeInfo(decision.decisionType);
  const chosenAlternative = decision.alternatives.find(
    (a) => a.id === decision.chosenAlternativeId
  );

  return (
    <div
      className={cn(
        "bg-dark-800 rounded-lg border border-dark-700 transition-all",
        "hover:border-dark-500"
      )}
    >
      {/* 决策头部 */}
      <div
        className="p-3 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            typeInfo.bgColor
          )}>
            <span className={cn("text-sm font-medium", typeInfo.textColor)}>
              {index}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={cn("text-xs", typeInfo.textColor)}>
                {typeInfo.label}
              </Badge>
              <QualityBadge quality={decision.quality} />
            </div>
            <p className="text-sm text-dark-200 line-clamp-2">
              {decision.description}
            </p>
          </div>

          <button
            className="text-dark-400 hover:text-dark-200 p-1"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* 选中方案预览 */}
        {chosenAlternative && !expanded && (
          <div className="mt-2 ml-11 flex items-center gap-2 text-xs">
            <Check size={12} className="text-green-400" />
            <span className="text-dark-300 truncate">
              {chosenAlternative.description}
            </span>
          </div>
        )}
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-dark-700">
          {/* 备选方案列表 */}
          <div className="mt-3">
            <div className="text-xs text-dark-400 mb-2 flex items-center gap-1">
              <Lightbulb size={12} />
              备选方案
            </div>
            <div className="space-y-2">
              {decision.alternatives.map((alt) => (
                <AlternativeItem
                  key={alt.id}
                  alternative={alt}
                  isChosen={alt.id === decision.chosenAlternativeId}
                />
              ))}
            </div>
          </div>

          {/* 选择理由 */}
          {decision.rationale && (
            <div className="mt-3">
              <div className="text-xs text-dark-400 mb-1 flex items-center gap-1">
                <Target size={12} />
                选择理由
              </div>
              <div className="text-sm text-dark-300 bg-dark-850 rounded p-2">
                {decision.rationale}
              </div>
            </div>
          )}

          {/* 质量评估 */}
          <div className="mt-3">
            <QualityDetails quality={decision.quality} />
          </div>

          {/* 时间戳 */}
          <div className="mt-3 text-xs text-dark-500 flex items-center gap-1">
            <Clock size={10} />
            {formatTimestamp(decision.timestamp)}
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * 备选方案项属性
 */
interface AlternativeItemProps {
  alternative: DecisionAlternative;
  isChosen: boolean;
}

/**
 * 备选方案项
 */
const AlternativeItem = memo(function AlternativeItem({
  alternative,
  isChosen,
}: AlternativeItemProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={cn(
        "rounded-lg p-2 transition-colors",
        isChosen
          ? "bg-green-500/10 border border-green-500/30"
          : "bg-dark-850 border border-transparent"
      )}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5">
          {isChosen ? (
            <Check size={14} className="text-green-400" />
          ) : (
            <div className="w-3.5 h-3.5 rounded-full border border-dark-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm",
            isChosen ? "text-dark-100" : "text-dark-300"
          )}>
            {alternative.description}
          </p>

          {/* 估算信息 */}
          {(alternative.estimatedCost !== undefined || alternative.estimatedDurationMs !== undefined) && (
            <div className="flex items-center gap-3 mt-1 text-xs text-dark-400">
              {alternative.estimatedCost !== undefined && (
                <span className="flex items-center gap-1">
                  <DollarSign size={10} />
                  ${alternative.estimatedCost.toFixed(4)}
                </span>
              )}
              {alternative.estimatedDurationMs !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {formatDuration(alternative.estimatedDurationMs)}
                </span>
              )}
            </div>
          )}

          {/* 展开详情按钮 */}
          {(alternative.pros.length > 0 || alternative.cons.length > 0) && (
            <>
              <button
                className="text-xs text-dark-400 hover:text-dark-200 mt-1"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? '收起' : '查看优缺点'}
              </button>

              {showDetails && (
                <div className="mt-2 space-y-2">
                  {alternative.pros.length > 0 && (
                    <div>
                      <div className="text-xs text-green-400 mb-1 flex items-center gap-1">
                        <ThumbsUp size={10} />
                        优点
                      </div>
                      <ul className="list-disc list-inside text-xs text-dark-300 ml-1">
                        {alternative.pros.map((pro, i) => (
                          <li key={i}>{pro}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {alternative.cons.length > 0 && (
                    <div>
                      <div className="text-xs text-red-400 mb-1 flex items-center gap-1">
                        <ThumbsDown size={10} />
                        缺点
                      </div>
                      <ul className="list-disc list-inside text-xs text-dark-300 ml-1">
                        {alternative.cons.map((con, i) => (
                          <li key={i}>{con}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * 质量徽章属性
 */
interface QualityBadgeProps {
  quality: DecisionQuality;
}

/**
 * 决策质量徽章
 */
const QualityBadge = memo(function QualityBadge({ quality }: QualityBadgeProps) {
  const scorePercent = Math.round(quality.score * 100);
  const colorClass = quality.score >= 0.8
    ? 'text-green-400 bg-green-400/20'
    : quality.score >= 0.5
      ? 'text-yellow-400 bg-yellow-400/20'
      : 'text-red-400 bg-red-400/20';

  return (
    <div className={cn("px-2 py-0.5 rounded text-xs flex items-center gap-1", colorClass)}>
      <BarChart2 size={10} />
      {scorePercent}%
    </div>
  );
});

/**
 * 质量详情属性
 */
interface QualityDetailsProps {
  quality: DecisionQuality;
}

/**
 * 决策质量详情
 */
const QualityDetails = memo(function QualityDetails({ quality }: QualityDetailsProps) {
  return (
    <div>
      <div className="text-xs text-dark-400 mb-2 flex items-center gap-1">
        <TrendingUp size={12} />
        质量评估
      </div>
      <div className="bg-dark-850 rounded p-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-dark-400">得分</span>
          <QualityScoreBar score={quality.score} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-dark-400">是否最优</span>
          {quality.isOptimal ? (
            <Badge variant="success" className="text-xs">是</Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-dark-400">否</Badge>
          )}
        </div>
        {quality.improvementSuggestions.length > 0 && (
          <div className="pt-2 border-t border-dark-700">
            <div className="text-xs text-dark-400 mb-1">改进建议</div>
            <ul className="list-disc list-inside text-xs text-dark-300">
              {quality.improvementSuggestions.map((suggestion, i) => (
                <li key={i}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * 质量得分条属性
 */
interface QualityScoreBarProps {
  score: number;
}

/**
 * 质量得分进度条
 */
const QualityScoreBar = memo(function QualityScoreBar({ score }: QualityScoreBarProps) {
  const percentage = Math.round(score * 100);
  const colorClass = score >= 0.8
    ? 'bg-green-500'
    : score >= 0.5
      ? 'bg-yellow-500'
      : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-dark-700 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-dark-300">{percentage}%</span>
    </div>
  );
});

/**
 * 获取决策类型信息
 */
function getDecisionTypeInfo(type: string): {
  label: string;
  bgColor: string;
  textColor: string;
} {
  const mapping: Record<DecisionType, { label: string; bgColor: string; textColor: string }> = {
    tool_selection: {
      label: '工具选择',
      bgColor: 'bg-purple-500/20',
      textColor: 'text-purple-400',
    },
    parameter_determination: {
      label: '参数确定',
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-400',
    },
    task_decomposition: {
      label: '任务分解',
      bgColor: 'bg-cyan-500/20',
      textColor: 'text-cyan-400',
    },
    prioritization: {
      label: '优先级排序',
      bgColor: 'bg-orange-500/20',
      textColor: 'text-orange-400',
    },
    error_handling_strategy: {
      label: '错误处理策略',
      bgColor: 'bg-red-500/20',
      textColor: 'text-red-400',
    },
    termination_judgment: {
      label: '终止判断',
      bgColor: 'bg-yellow-500/20',
      textColor: 'text-yellow-400',
    },
    subtask_delegation: {
      label: '子任务委托',
      bgColor: 'bg-indigo-500/20',
      textColor: 'text-indigo-400',
    },
    other: {
      label: '其他',
      bgColor: 'bg-dark-500/20',
      textColor: 'text-dark-400',
    },
  };
  return mapping[type as DecisionType] || mapping.other;
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

export default DecisionAnalysisPanel;
