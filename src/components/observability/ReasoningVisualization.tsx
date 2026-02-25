/**
 * 推理链可视化组件
 * 
 * 以树状结构展示 LLM 的推理过程
 */

import { useState, memo } from 'react';
import { cn } from '@/lib/utils';
import { 
  ChevronUp, 
  ChevronDown, 
  HelpCircle, 
  Search, 
  Lightbulb, 
  CheckCircle, 
  GitBranch, 
  ListOrdered, 
  Activity, 
  BarChart2, 
  AlertTriangle,
  FileCheck,
  LucideIcon,
} from 'lucide-react';
import type { ReasoningChain, ReasoningStep, ReasoningType } from '@/types/global';

interface ReasoningVisualizationProps {
  reasoning: ReasoningChain;
  onStepClick?: (step: ReasoningStep) => void;
  className?: string;
}

export const ReasoningVisualization = memo(function ReasoningVisualization({
  reasoning,
  onStepClick,
  className,
}: ReasoningVisualizationProps) {
  return (
    <div className={cn("bg-dark-900 rounded-lg p-4", className)}>
      <div className="space-y-2">
        {reasoning.steps.map((step, index) => (
          <ReasoningNode
            key={index}
            step={step}
            isLast={index === reasoning.steps.length - 1}
            onClick={() => onStepClick?.(step)}
          />
        ))}
      </div>
      
      {reasoning.conclusion && (
        <div className="mt-4 pt-4 border-t border-dark-700">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-400" />
            <span className="text-sm font-medium text-dark-200">结论</span>
          </div>
          <div className="text-sm text-dark-300 bg-dark-800 rounded-lg p-3">
            {reasoning.conclusion}
          </div>
          {reasoning.confidence !== undefined && (
            <ConfidenceIndicator value={reasoning.confidence} className="mt-2" />
          )}
        </div>
      )}
    </div>
  );
});

interface ReasoningNodeProps {
  step: ReasoningStep;
  isLast: boolean;
  onClick?: () => void;
}

const ReasoningNode = memo(function ReasoningNode({
  step,
  isLast,
  onClick,
}: ReasoningNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = getReasoningTypeInfo(step.reasoningType);
  const hasDetails = step.evidence.length > 0 || step.hypotheses.length > 0;

  return (
    <div className="relative pl-6">
      {!isLast && (
        <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-dark-600" />
      )}
      
      <div
        className={cn(
          "bg-dark-800 rounded-lg p-3 cursor-pointer transition-all border border-transparent",
          "hover:bg-dark-750 hover:border-dark-500"
        )}
        onClick={onClick}
      >
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium",
          typeInfo.badgeColor
        )}>
          <typeInfo.icon size={12} />
          <span>{typeInfo.label}</span>
        </div>

        <div className="text-sm text-dark-100 mt-2 leading-relaxed">
          {step.content}
        </div>

        {hasDetails && (
          <button
            className="mt-2 text-xs text-dark-400 hover:text-dark-200 flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? '收起详情' : '查看详情'}
          </button>
        )}

        {expanded && hasDetails && (
          <div className="mt-3 pt-3 border-t border-dark-600 space-y-3">
            {step.evidence.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-xs text-dark-400 mb-1">
                  <FileCheck size={12} />
                  <span>证据</span>
                </div>
                <ul className="list-disc list-inside text-xs text-dark-300 ml-3">
                  {step.evidence.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {step.hypotheses.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-xs text-dark-400 mb-1">
                  <Lightbulb size={12} />
                  <span>假设</span>
                </div>
                <ul className="list-disc list-inside text-xs text-dark-300 ml-3">
                  {step.hypotheses.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

interface ConfidenceIndicatorProps {
  value: number;
  className?: string;
}

const ConfidenceIndicator = memo(function ConfidenceIndicator({
  value,
  className,
}: ConfidenceIndicatorProps) {
  const percentage = Math.round(value * 100);
  const colorClass = value >= 0.8 ? 'bg-green-500' : value >= 0.5 ? 'bg-yellow-500' : 'bg-red-500';
  const textClass = value >= 0.8 ? 'text-green-400' : value >= 0.5 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs text-dark-400">置信度:</span>
      <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn("text-xs font-medium", textClass)}>{percentage}%</span>
    </div>
  );
});

function getReasoningTypeInfo(type: string): {
  label: string;
  icon: LucideIcon;
  badgeColor: string;
} {
  const mapping: Record<ReasoningType, { label: string; icon: LucideIcon; badgeColor: string }> = {
    problem_understanding: { label: '问题理解', icon: HelpCircle, badgeColor: 'text-blue-400 bg-blue-400/20' },
    information_gathering: { label: '信息收集', icon: Search, badgeColor: 'text-cyan-400 bg-cyan-400/20' },
    hypothesis_generation: { label: '假设生成', icon: Lightbulb, badgeColor: 'text-yellow-400 bg-yellow-400/20' },
    hypothesis_validation: { label: '假设验证', icon: CheckCircle, badgeColor: 'text-green-400 bg-green-400/20' },
    decision_making: { label: '决策制定', icon: GitBranch, badgeColor: 'text-purple-400 bg-purple-400/20' },
    planning: { label: '计划制定', icon: ListOrdered, badgeColor: 'text-indigo-400 bg-indigo-400/20' },
    execution_monitoring: { label: '执行监控', icon: Activity, badgeColor: 'text-orange-400 bg-orange-400/20' },
    result_evaluation: { label: '结果评估', icon: BarChart2, badgeColor: 'text-teal-400 bg-teal-400/20' },
    error_correction: { label: '错误纠正', icon: AlertTriangle, badgeColor: 'text-red-400 bg-red-400/20' },
  };
  return mapping[type as ReasoningType] || { label: '未知', icon: HelpCircle, badgeColor: 'text-dark-400 bg-dark-400/20' };
}

export default ReasoningVisualization;
