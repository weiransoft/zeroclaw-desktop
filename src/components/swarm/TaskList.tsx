import { SwarmTask } from '@/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Bot, Loader2 } from 'lucide-react';

interface TaskListProps {
  tasks: SwarmTask[];
  selectedTaskId: string | null;
  onSelect: (taskId: string) => void;
  loading: boolean;
}

export function TaskList({
  tasks,
  selectedTaskId,
  onSelect,
  loading,
}: TaskListProps) {
  if (loading && tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-dark-400" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-dark-500 text-sm p-4">
        暂无任务
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => onSelect(task.id)}
          className={cn(
            'p-3 border-b border-dark-700 cursor-pointer transition-colors',
            selectedTaskId === task.id
              ? 'bg-dark-800'
              : 'hover:bg-dark-800/50'
          )}
        >
          <div className="flex items-start gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                task.status === 'running' ? 'bg-green-600' :
                task.status === 'completed' ? 'bg-blue-600' :
                task.status === 'failed' ? 'bg-red-600' :
                'bg-dark-600'
              )}
            >
              {task.status === 'running' ? (
                <Loader2 size={14} className="text-white animate-spin" />
              ) : (
                <Bot size={14} className="text-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-dark-100 truncate">
                  {task.agentName}
                </span>
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    task.status === 'running' && 'bg-green-600/20 text-green-400',
                    task.status === 'completed' && 'bg-blue-600/20 text-blue-400',
                    task.status === 'failed' && 'bg-red-600/20 text-red-400',
                    task.status === 'pending' && 'bg-dark-600 text-dark-400'
                  )}
                >
                  {getStatusText(task.status)}
                </span>
              </div>
              <p className="text-xs text-dark-400 mt-1 line-clamp-2">
                {task.task}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-dark-500">
                <span>Depth: {task.depth}</span>
                <span>•</span>
                <span>
                  {task.createdAt && !isNaN(new Date(task.createdAt).getTime())
                    ? formatDistanceToNow(task.createdAt, {
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
    pending: '等待',
    running: '运行',
    completed: '完成',
    failed: '失败',
  };
  return statusMap[status] || status;
}
