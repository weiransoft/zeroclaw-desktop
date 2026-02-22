import { Workflow } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Copy,
  Download,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface WorkflowDetailProps {
  workflow: Workflow;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function WorkflowDetail({
  workflow,
  onStart,
  onPause,
  onResume,
  onStop,
}: WorkflowDetailProps) {
  const totalSteps = workflow.steps.length;
  const completedSteps = workflow.steps.filter(
    (s) => s.status === 'completed'
  ).length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-dark-700 p-4 bg-dark-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-dark-100">
              {workflow.name}
            </h2>
            <p className="text-sm text-dark-400 mt-1">
              {workflow.description || '无描述'}
            </p>
          </div>
          <Badge
            variant={
              workflow.status === 'running'
                ? 'success'
                : workflow.status === 'completed'
                ? 'default'
                : workflow.status === 'paused'
                ? 'warning'
                : 'secondary'
            }
          >
            {getStatusText(workflow.status)}
          </Badge>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-dark-400">进度</span>
            <span className="text-dark-200">
              {completedSteps}/{totalSteps} 步骤
            </span>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          {workflow.status === 'created' && (
            <Button onClick={onStart}>
              <Play size={16} className="mr-2" />
              启动
            </Button>
          )}
          {workflow.status === 'running' && (
            <>
              <Button onClick={onPause} variant="outline">
                <Pause size={16} className="mr-2" />
                暂停
              </Button>
              <Button onClick={onStop} variant="destructive">
                <Square size={16} className="mr-2" />
                停止
              </Button>
            </>
          )}
          {workflow.status === 'paused' && (
            <>
              <Button onClick={onResume}>
                <Play size={16} className="mr-2" />
                继续
              </Button>
              <Button onClick={onStop} variant="destructive">
                <Square size={16} className="mr-2" />
                停止
              </Button>
            </>
          )}
          {workflow.status === 'stopped' && (
            <Button onClick={onStart}>
              <RotateCcw size={16} className="mr-2" />
              重试
            </Button>
          )}
          <Button variant="ghost" size="icon">
            <Copy size={16} />
          </Button>
          <Button variant="ghost" size="icon">
            <Download size={16} />
          </Button>
        </div>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-medium text-dark-200 mb-3">步骤</h3>
        {workflow.steps.map((step, index) => (
          <div
            key={index}
            className="bg-dark-800 rounded-lg p-4 border border-dark-700"
          >
            <div className="flex items-start gap-3">
              {/* Step number */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  step.status === 'completed'
                    ? 'bg-green-600'
                    : step.status === 'running'
                    ? 'bg-primary-600'
                    : step.status === 'failed'
                    ? 'bg-red-600'
                    : 'bg-dark-600'
                )}
              >
                {step.status === 'completed' ? (
                  <CheckCircle size={16} className="text-white" />
                ) : step.status === 'running' ? (
                  <Loader2 size={16} className="text-white animate-spin" />
                ) : step.status === 'failed' ? (
                  <AlertCircle size={16} className="text-white" />
                ) : (
                  <span className="text-sm text-dark-300">{index + 1}</span>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-dark-100">{step.name}</span>
                  <Badge
                    variant={
                      step.status === 'completed'
                        ? 'success'
                        : step.status === 'running'
                        ? 'default'
                        : step.status === 'failed'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {getStepStatusText(step.status)}
                  </Badge>
                </div>
                <p className="text-sm text-dark-400 mt-1">{step.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-dark-500">
                  <span>负责人: {step.assignedTo}</span>
                  {step.dependencies.length > 0 && (
                    <span>依赖: {step.dependencies.join(', ')}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Roles */}
      <div className="p-4 border-t border-dark-700">
        <h3 className="text-sm font-medium text-dark-200 mb-3">角色</h3>
        <div className="flex flex-wrap gap-2">
          {workflow.roles.map((role, index) => (
            <Badge key={index} variant="outline">
              {role}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    created: '已创建',
    running: '运行中',
    paused: '已暂停',
    stopped: '已停止',
    completed: '已完成',
    waiting_for_boss_approval: '等待审批',
  };
  return statusMap[status] || status;
}

function getStepStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '等待中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
  };
  return statusMap[status] || status;
}
