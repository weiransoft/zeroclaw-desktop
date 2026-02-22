import { useSwarm } from '@/hooks/useSwarm';
import { TaskList } from './TaskList';
import { ChatTimeline } from './ChatTimeline';
import { ConsensusPanel } from './ConsensusPanel';
import { RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SwarmView() {
  const {
    tasks,
    messages,
    consensus,
    selectedTaskId,
    loading,
    streamingMessage,
    loadTasks,
    selectTask,
  } = useSwarm();

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="flex h-full">
      {/* Task List Sidebar */}
      <div className="w-72 border-r border-dark-700 flex flex-col bg-dark-900">
        {/* Header */}
        <div className="p-3 border-b border-dark-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-dark-400" />
            <span className="font-medium text-dark-100">任务列表</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadTasks}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>

        {/* Task List */}
        <TaskList
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          onSelect={selectTask}
          loading={loading}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedTask ? (
          <>
            {/* Task Header */}
            <div className="border-b border-dark-700 p-4 bg-dark-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-dark-100">
                    {selectedTask.agentName}
                  </h2>
                  <p className="text-sm text-dark-400 mt-1">
                    {selectedTask.task}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`status-badge ${selectedTask.status}`}
                  >
                    {getStatusText(selectedTask.status)}
                  </span>
                  <span className="text-xs text-dark-500">
                    Depth: {selectedTask.depth}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ChatTimeline messages={messages} streamingMessage={streamingMessage} />

            {/* Consensus Panel */}
            {consensus && <ConsensusPanel consensus={consensus} />}
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-dark-400">
            <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center mb-4">
              <span className="text-3xl">🤖</span>
            </div>
            <h3 className="text-lg font-medium text-dark-200 mb-2">
              智能体群聊
            </h3>
            <p className="text-sm text-dark-400">
              选择一个任务查看群聊消息
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '等待中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
  };
  return statusMap[status] || status;
}
