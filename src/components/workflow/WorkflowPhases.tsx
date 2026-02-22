/**
 * 工作流阶段视图组件
 * 显示 Scrum 工作流的阶段状态、进度和可交付物
 */
import { WorkflowPhaseDetail, Deliverable, PhaseStatusType } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Users,
  FileText,
  Code,
  TestTube,
  FileCheck,
  Rocket,
  ChevronRight,
  Pause,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

interface WorkflowPhasesProps {
  phases: WorkflowPhaseDetail[];
  currentPhase: string;
  onPhaseClick?: (phaseId: string) => void;
}

/**
 * 获取阶段状态图标
 */
function getStatusIcon(status: PhaseStatusType) {
  switch (status) {
    case 'completed':
      return <CheckCircle size={16} className="text-green-500" />;
    case 'in_progress':
      return <Loader2 size={16} className="text-blue-500 animate-spin" />;
    case 'waiting_for_dependencies':
      return <Pause size={16} className="text-yellow-500" />;
    case 'waiting_for_approval':
      return <ThumbsUp size={16} className="text-orange-500" />;
    case 'waiting_for_consensus':
      return <Users size={16} className="text-purple-500" />;
    case 'needs_adjustment':
      return <AlertCircle size={16} className="text-red-500" />;
    default:
      return <Clock size={16} className="text-gray-500" />;
  }
}

/**
 * 获取阶段状态文本
 */
function getStatusText(status: PhaseStatusType): string {
  const statusMap: Record<PhaseStatusType, string> = {
    pending: '等待中',
    in_progress: '进行中',
    waiting_for_dependencies: '等待依赖',
    waiting_for_approval: '等待审批',
    waiting_for_consensus: '等待共识',
    completed: '已完成',
    needs_adjustment: '需要调整',
  };
  return statusMap[status] || status;
}

/**
 * 获取阶段状态颜色
 */
function getStatusColor(status: PhaseStatusType): string {
  switch (status) {
    case 'completed':
      return 'bg-green-600';
    case 'in_progress':
      return 'bg-blue-600';
    case 'waiting_for_dependencies':
      return 'bg-yellow-600';
    case 'waiting_for_approval':
      return 'bg-orange-600';
    case 'waiting_for_consensus':
      return 'bg-purple-600';
    case 'needs_adjustment':
      return 'bg-red-600';
    default:
      return 'bg-gray-600';
  }
}

/**
 * 获取可交付物图标
 */
function getDeliverableIcon(type: string) {
  switch (type) {
    case 'document':
      return <FileText size={14} />;
    case 'code':
      return <Code size={14} />;
    case 'test':
      return <TestTube size={14} />;
    case 'review':
      return <FileCheck size={14} />;
    case 'deployment':
      return <Rocket size={14} />;
    default:
      return <FileText size={14} />;
  }
}

/**
 * 可交付物列表组件
 */
function DeliverableList({ deliverables }: { deliverables: Deliverable[] }) {
  if (deliverables.length === 0) {
    return <div className="text-xs text-dark-500">无可交付物</div>;
  }

  return (
    <div className="space-y-2 mt-2">
      {deliverables.map((deliverable) => (
        <div
          key={deliverable.id}
          className="flex items-center gap-2 text-xs bg-dark-800 rounded px-2 py-1"
        >
          <span className="text-dark-400">{getDeliverableIcon(deliverable.type)}</span>
          <span className="flex-1 text-dark-200 truncate">{deliverable.name}</span>
          <Badge
            variant={
              deliverable.status === 'completed'
                ? 'success'
                : deliverable.status === 'in_progress'
                ? 'default'
                : 'secondary'
            }
            className="text-[10px]"
          >
            {deliverable.status === 'completed'
              ? '完成'
              : deliverable.status === 'in_progress'
              ? '进行中'
              : '待处理'}
          </Badge>
        </div>
      ))}
    </div>
  );
}

/**
 * 阶段卡片组件
 */
function PhaseCard({
  phase,
  isCurrent,
  isLast,
  onClick,
}: {
  phase: WorkflowPhaseDetail;
  isCurrent: boolean;
  isLast: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="flex">
      {/* 连接线 */}
      <div className="flex flex-col items-center mr-4">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
            getStatusColor(phase.status)
          )}
        >
          {getStatusIcon(phase.status)}
        </div>
        {!isLast && (
          <div
            className={cn(
              'w-0.5 flex-1 my-1',
              phase.status === 'completed' ? 'bg-green-600' : 'bg-dark-700'
            )}
          />
        )}
      </div>

      {/* 阶段内容 */}
      <Card
        className={cn(
          'flex-1 mb-4 cursor-pointer transition-all',
          isCurrent ? 'border-blue-500 bg-dark-850' : 'bg-dark-900',
          'hover:border-dark-600'
        )}
        onClick={onClick}
      >
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              {phase.name}
              {isCurrent && (
                <Badge variant="default" className="text-[10px]">
                  当前阶段
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-400">
                {Math.round(phase.progress * 100)}%
              </span>
              <Badge variant="outline" className="text-[10px]">
                {getStatusText(phase.status)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <p className="text-xs text-dark-400 mb-2">{phase.description}</p>

          {/* 进度条 */}
          {phase.status === 'in_progress' && (
            <div className="h-1 bg-dark-700 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${phase.progress * 100}%` }}
              />
            </div>
          )}

          {/* 分配成员 */}
          {phase.assignedTo.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-dark-500 mb-2">
              <Users size={12} />
              <span>{phase.assignedTo.join(', ')}</span>
            </div>
          )}

          {/* 依赖 */}
          {phase.dependencies.length > 0 && (
            <div className="text-xs text-dark-500 mb-2">
              依赖: {phase.dependencies.join(', ')}
            </div>
          )}

          {/* 可交付物 */}
          <DeliverableList deliverables={phase.deliverables} />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 工作流阶段视图主组件
 */
export function WorkflowPhases({
  phases,
  currentPhase,
  onPhaseClick,
}: WorkflowPhasesProps) {
  if (phases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-dark-500">
        <AlertCircle size={24} className="mb-2" />
        <span>暂无阶段信息</span>
      </div>
    );
  }

  return (
    <div className="py-4">
      {phases.map((phase, index) => (
        <PhaseCard
          key={phase.id}
          phase={phase}
          isCurrent={phase.id === currentPhase}
          isLast={index === phases.length - 1}
          onClick={() => onPhaseClick?.(phase.id)}
        />
      ))}
    </div>
  );
}

/**
 * 阶段详情面板组件
 */
export function PhaseDetailPanel({ phase }: { phase: WorkflowPhaseDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {phase.name}
          <Badge
            variant={phase.status === 'completed' ? 'success' : 'default'}
          >
            {getStatusText(phase.status)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-xs text-dark-400 mb-1">描述</div>
          <div className="text-sm text-dark-200">{phase.description}</div>
        </div>

        {phase.status === 'in_progress' && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-dark-400">进度</span>
              <span className="text-dark-200">{Math.round(phase.progress * 100)}%</span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${phase.progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {phase.assignedTo.length > 0 && (
          <div>
            <div className="text-xs text-dark-400 mb-1">负责人</div>
            <div className="flex flex-wrap gap-1">
              {phase.assignedTo.map((member) => (
                <Badge key={member} variant="outline">
                  {member}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {phase.deliverables.length > 0 && (
          <div>
            <div className="text-xs text-dark-400 mb-1">可交付物</div>
            <DeliverableList deliverables={phase.deliverables} />
          </div>
        )}

        {phase.startedAt && (
          <div className="text-xs text-dark-500">
            开始时间: {new Date(phase.startedAt * 1000).toLocaleString()}
          </div>
        )}

        {phase.completedAt && (
          <div className="text-xs text-dark-500">
            完成时间: {new Date(phase.completedAt * 1000).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
