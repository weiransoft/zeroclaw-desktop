import { Workflow } from '@/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { GitBranch, Loader2, Pause, Play, CheckCircle, XCircle } from 'lucide-react';

interface WorkflowListProps {
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

export function WorkflowList({
  workflows,
  selectedWorkflowId,
  onSelect,
  loading,
}: WorkflowListProps) {
  if (loading && workflows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-dark-400" />
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-dark-500 text-sm p-4">
        暂无工作流
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {workflows.map((workflow) => (
        <div
          key={workflow.id}
          onClick={() => onSelect(workflow.id)}
          className={cn(
            'p-3 border-b border-dark-700 cursor-pointer transition-colors',
            selectedWorkflowId === workflow.id
              ? 'bg-dark-800'
              : 'hover:bg-dark-800/50'
          )}
        >
          <div className="flex items-start gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                workflow.status === 'running' ? 'bg-green-600' :
                workflow.status === 'completed' ? 'bg-blue-600' :
                workflow.status === 'paused' ? 'bg-yellow-600' :
                workflow.status === 'stopped' ? 'bg-red-600' :
                'bg-dark-600'
              )}
            >
              {workflow.status === 'running' ? (
                <Play size={14} className="text-white" />
              ) : workflow.status === 'paused' ? (
                <Pause size={14} className="text-white" />
              ) : workflow.status === 'completed' ? (
                <CheckCircle size={14} className="text-white" />
              ) : workflow.status === 'stopped' ? (
                <XCircle size={14} className="text-white" />
              ) : (
                <GitBranch size={14} className="text-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-dark-100 truncate">
                  {workflow.name}
                </span>
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    workflow.status === 'running' && 'bg-green-600/20 text-green-400',
                    workflow.status === 'completed' && 'bg-blue-600/20 text-blue-400',
                    workflow.status === 'paused' && 'bg-yellow-600/20 text-yellow-400',
                    workflow.status === 'stopped' && 'bg-red-600/20 text-red-400',
                    workflow.status === 'created' && 'bg-dark-600 text-dark-400'
                  )}
                >
                  {getStatusText(workflow.status)}
                </span>
              </div>
              <p className="text-xs text-dark-400 mt-1 line-clamp-2">
                {workflow.description || '无描述'}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-dark-500">
                <span>{workflow.steps.length} 步骤</span>
                <span>•</span>
                <span>
                  {workflow.updatedAt && !isNaN(new Date(workflow.updatedAt).getTime())
                    ? formatDistanceToNow(workflow.updatedAt, {
                        addSuffix: true,
                        locale: zhCN,
                      })
                    : '刚刚'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
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
