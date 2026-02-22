import { Message } from '@/types';
import { cn } from '@/lib/utils';
import { User, Bot, Wrench, CheckCircle, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';

interface MessageItemProps {
  message: Message;
  isLast: boolean;
  streaming: boolean;
  assistantName?: string;
}

export function MessageItem({ message, isLast, streaming, assistantName = '助手' }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={cn(
        'flex items-start gap-3 animate-fade-in',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          isUser ? 'bg-blue-600' : 'bg-primary-600'
        )}
      >
        {isUser ? (
          <User size={16} className="text-white" />
        ) : (
          <Bot size={16} className="text-white" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex-1 max-w-[80%]',
          isUser && 'flex flex-col items-end'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-2 mb-1',
            isUser && 'flex-row-reverse'
          )}
        >
          <span className="text-sm font-medium text-dark-200">
            {isUser ? '你' : assistantName}
          </span>
          <span className="text-xs text-dark-500">
            {format(message.timestamp, 'HH:mm:ss')}
          </span>
        </div>

        {/* Message content */}
        <div
          className={cn(
            'rounded-lg px-4 py-3',
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-dark-800 text-dark-100'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="message-content prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Streaming indicator */}
          {streaming && isLast && (
            <span className="inline-block w-2 h-4 bg-primary-400 animate-pulse ml-1" />
          )}
        </div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-2 w-full">
            {message.toolCalls.map((tool, index) => (
              <div key={index} className="tool-call">
                <div className="tool-call-header">
                  <Wrench size={14} className="text-dark-300" />
                  <span className="text-sm font-medium text-dark-200">
                    {tool.name}
                  </span>
                  {tool.success !== undefined && (
                    tool.success ? (
                      <CheckCircle size={14} className="text-green-400" />
                    ) : (
                      <XCircle size={14} className="text-red-400" />
                    )
                  )}
                  {tool.duration && (
                    <span className="text-xs text-dark-400 ml-auto">
                      {tool.duration}ms
                    </span>
                  )}
                </div>
                {tool.result && (
                  <div className="tool-call-content">
                    <pre className="text-xs text-dark-300 whitespace-pre-wrap overflow-x-auto">
                      {tool.result.slice(0, 500)}
                      {tool.result.length > 500 && '...'}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
