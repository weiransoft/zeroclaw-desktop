import { SwarmMessage, MessageType } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Bot, User, AlertCircle, CheckCircle, Info, Vote } from 'lucide-react';

interface ChatTimelineProps {
  messages: SwarmMessage[];
  streamingMessage?: { author: string; content: string } | null;
}

export function ChatTimeline({ messages, streamingMessage }: ChatTimelineProps) {
  if (messages.length === 0 && !streamingMessage) {
    return (
      <div className="flex-1 flex items-center justify-center text-dark-400">
        暂无消息
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg, index) => (
        <MessageBubble key={msg.id || index} message={msg} />
      ))}
      
      {/* Streaming message */}
      {streamingMessage && (
        <div className="flex items-start gap-2 animate-fade-in">
          <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
            <Bot size={14} className="text-white" />
          </div>
          <div className="flex-1 max-w-[75%]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-dark-200">
                {streamingMessage.author}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400">
                生成中...
              </span>
            </div>
            <div className="rounded-lg px-3 py-2 text-sm bg-dark-800 text-dark-100">
              <p className="whitespace-pre-wrap">
                {streamingMessage.content}
                <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: SwarmMessage }) {
  const isAgent = message.authorType === 'agent';
  const messageType = message.messageType;

  return (
    <div
      className={cn(
        'flex items-start gap-2 animate-fade-in',
        !isAgent && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
          isAgent ? 'bg-primary-600' : 'bg-blue-600'
        )}
      >
        {isAgent ? (
          <Bot size={14} className="text-white" />
        ) : (
          <User size={14} className="text-white" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex-1 max-w-[75%]',
          !isAgent && 'flex flex-col items-end'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-2 mb-1',
            !isAgent && 'flex-row-reverse'
          )}
        >
          <span className="text-xs font-medium text-dark-200">
            {message.author}
          </span>
          <MessageTypeBadge type={messageType} />
          <span className="text-xs text-dark-500">
            {format(message.timestamp, 'HH:mm:ss')}
          </span>
        </div>

        {/* Message */}
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm',
            getMessageStyle(messageType)
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </div>
  );
}

function MessageTypeBadge({ type }: { type: MessageType }) {
  const config: Record<MessageType, { label: string; className: string; icon: any }> = {
    task_assignment: { label: '任务分配', className: 'bg-blue-600/20 text-blue-400', icon: CheckCircle },
    task_status: { label: '状态更新', className: 'bg-green-600/20 text-green-400', icon: Info },
    task_progress: { label: '进度', className: 'bg-yellow-600/20 text-yellow-400', icon: Info },
    task_completion: { label: '完成', className: 'bg-green-600/20 text-green-400', icon: CheckCircle },
    task_failure: { label: '失败', className: 'bg-red-600/20 text-red-400', icon: AlertCircle },
    consensus_request: { label: '共识请求', className: 'bg-purple-600/20 text-purple-400', icon: Vote },
    consensus_response: { label: '共识响应', className: 'bg-purple-600/20 text-purple-400', icon: Vote },
    disagreement: { label: '异议', className: 'bg-orange-600/20 text-orange-400', icon: AlertCircle },
    clarification: { label: '澄清', className: 'bg-cyan-600/20 text-cyan-400', icon: Info },
    correction: { label: '修正', className: 'bg-pink-600/20 text-pink-400', icon: Info },
    info: { label: '信息', className: 'bg-dark-600 text-dark-300', icon: Info },
  };

  const { label, className: badgeClass, icon: Icon } = config[type] || config.info;

  return (
    <span className={cn('text-xs px-1.5 py-0.5 rounded flex items-center gap-1', badgeClass)}>
      <Icon size={10} />
      {label}
    </span>
  );
}

function getMessageStyle(type: MessageType): string {
  const styles: Record<MessageType, string> = {
    task_assignment: 'bg-blue-600/10 border border-blue-600/20 text-dark-100',
    task_status: 'bg-green-600/10 border border-green-600/20 text-dark-100',
    task_progress: 'bg-yellow-600/10 border border-yellow-600/20 text-dark-100',
    task_completion: 'bg-green-600/10 border border-green-600/20 text-dark-100',
    task_failure: 'bg-red-600/10 border border-red-600/20 text-dark-100',
    consensus_request: 'bg-purple-600/10 border border-purple-600/20 text-dark-100',
    consensus_response: 'bg-purple-600/10 border border-purple-600/20 text-dark-100',
    disagreement: 'bg-orange-600/10 border border-orange-600/20 text-dark-100',
    clarification: 'bg-cyan-600/10 border border-cyan-600/20 text-dark-100',
    correction: 'bg-pink-600/10 border border-pink-600/20 text-dark-100',
    info: 'bg-dark-800 text-dark-100',
  };

  return styles[type] || styles.info;
}
