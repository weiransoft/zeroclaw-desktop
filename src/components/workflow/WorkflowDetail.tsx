/**
 * 工作流详情组件
 * 显示工作流的完整信息，包括阶段、审批和可交付物
 */
import { useState, useEffect } from 'react';
import { Workflow, WorkflowPhaseDetail, ApprovalRequest, WorkflowContext } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Layers,
  ThumbsUp,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { WorkflowPhases, PhaseDetailPanel } from './WorkflowPhases';
import { ApprovalManager, ApprovalQueueBadge } from './ApprovalManager';

interface WorkflowDetailProps {
  workflow: Workflow;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

/**
 * 获取状态文本
 */
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

/**
 * 获取步骤状态文本
 */
function getStepStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '等待中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
  };
  return statusMap[status] || status;
}

export function WorkflowDetail({
  workflow,
  onStart,
  onPause,
  onResume,
  onStop,
}: WorkflowDetailProps) {
  const [phases, setPhases] = useState<WorkflowPhaseDetail[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [context, setContext] = useState<WorkflowContext | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<WorkflowPhaseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'phases' | 'steps' | 'approvals'>('phases');

  // 加载工作流详情
  useEffect(() => {
    loadWorkflowDetails();
  }, [workflow.id]);

  const loadWorkflowDetails = async () => {
    setLoading(true);
    try {
      // 加载阶段信息
      const phasesResult = await window.zeroclaw.workflow.getPhases(workflow.id);
      if (phasesResult) {
        setPhases(phasesResult);
      }

      // 加载审批请求
      const approvalsResult = await window.zeroclaw.workflow.listApprovals(workflow.id);
      if (approvalsResult) {
        setApprovals(approvalsResult);
      }

      // 加载工作流上下文
      const contextResult = await window.zeroclaw.workflow.getContext(workflow.id);
      if (contextResult) {
        setContext(contextResult);
      }
    } catch (err) {
      console.error('Failed to load workflow details:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = workflow.steps.length;
  const completedSteps = workflow.steps.filter((s) => s.status === 'completed').length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // 计算阶段进度
  const phaseProgress = phases.length > 0
    ? phases.reduce((sum, p) => sum + p.progress, 0) / phases.length
    : 0;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* 头部 */}
      <div className="border-b border-dark-700 p-4 bg-dark-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-dark-100">{workflow.name}</h2>
            <p className="text-sm text-dark-400 mt-1">{workflow.description || '无描述'}</p>
          </div>
          <div className="flex items-center gap-2">
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
            {Array.isArray(approvals) && approvals.filter((a) => a.status === 'pending').length > 0 && (
              <ApprovalQueueBadge />
            )}
          </div>
        </div>

        {/* 进度 */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-dark-400">步骤进度</span>
              <span className="text-dark-200">
                {completedSteps}/{totalSteps}
              </span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-dark-400">阶段进度</span>
              <span className="text-dark-200">{Math.round(phaseProgress * 100)}%</span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 transition-all duration-300"
                style={{ width: `${phaseProgress * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
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
          <Button variant="ghost" size="icon" onClick={loadWorkflowDetails}>
            <RefreshCw size={16} />
          </Button>
          <Button variant="ghost" size="icon">
            <Copy size={16} />
          </Button>
          <Button variant="ghost" size="icon">
            <Download size={16} />
          </Button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="phases">
              <Layers size={14} className="mr-1" />
              阶段 ({phases.length})
            </TabsTrigger>
            <TabsTrigger value="steps">
              <FileText size={14} className="mr-1" />
              步骤 ({totalSteps})
            </TabsTrigger>
            <TabsTrigger value="approvals">
              <ThumbsUp size={14} className="mr-1" />
              审批 ({Array.isArray(approvals) ? approvals.filter((a) => a.status === 'pending').length : 0})
            </TabsTrigger>
          </TabsList>

          {/* 阶段视图 */}
          <TabsContent value="phases">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="text-dark-400 animate-spin" />
              </div>
            ) : phases.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <WorkflowPhases
                    phases={phases}
                    currentPhase={context?.currentPhase || ''}
                    onPhaseClick={(id) => {
                      const phase = phases.find((p) => p.id === id);
                      setSelectedPhase(phase || null);
                    }}
                  />
                </div>
                <div>
                  {selectedPhase ? (
                    <PhaseDetailPanel phase={selectedPhase} />
                  ) : (
                    <Card>
                      <CardContent className="py-8">
                        <div className="text-center text-dark-500">
                          <Layers size={24} className="mx-auto mb-2" />
                          <span>选择一个阶段查看详情</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-dark-500">
                <Layers size={32} className="mb-2" />
                <span>暂无阶段信息</span>
              </div>
            )}
          </TabsContent>

          {/* 步骤视图 */}
          <TabsContent value="steps">
            <div className="space-y-3">
              {workflow.steps.map((step, index) => (
                <div
                  key={index}
                  className="bg-dark-800 rounded-lg p-4 border border-dark-700"
                >
                  <div className="flex items-start gap-3">
                    {/* 步骤编号 */}
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

                    {/* 步骤内容 */}
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
          </TabsContent>

          {/* 审批视图 */}
          <TabsContent value="approvals">
            <ApprovalManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* 角色 */}
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
