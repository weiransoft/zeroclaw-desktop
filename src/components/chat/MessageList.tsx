import { useEffect, useRef } from 'react';
import { Message } from '@/types';
import { MessageItem } from './MessageItem';
import { Brain, MessageSquare, Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  streaming: boolean;
  streamingContent?: string;
  status?: { status: string; message: string } | null;
  assistantName?: string;
}

export function MessageList({ messages, loading, streaming, streamingContent, status, assistantName }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, status]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <MessageItem
          key={message.id || index}
          message={message}
          isLast={index === messages.length - 1}
          streaming={streaming && message.role === 'assistant' && index === messages.length - 1}
          assistantName={assistantName}
        />
      ))}

      {/* Status indicator */}
      {loading && status && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm text-dark-300 animate-fade-in">
          {status.status === 'thinking' && (
            <>
              <Brain size={16} className="text-blue-400 animate-pulse" />
              <span className="text-blue-400">{status.message || '智能体正在思考...'}</span>
            </>
          )}
          {status.status === 'responding' && (
            <>
              <MessageSquare size={16} className="text-green-400 animate-pulse" />
              <span className="text-green-400">{status.message || '智能体正在回复...'}</span>
            </>
          )}
          {status.status === 'error' && (
            <span className="text-red-400">❌ {status.message || '发生错误'}</span>
          )}
          {status.status !== 'thinking' && status.status !== 'responding' && status.status !== 'error' && (
            <>
              <Loader2 size={16} className="text-dark-400 animate-spin" />
              <span>{status.message || '处理中...'}</span>
            </>
          )}
        </div>
      )}

      {/* Streaming content */}
      {streaming && streamingContent && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
            <span className="text-white text-sm">🤖</span>
          </div>
          <div className="bg-dark-800 rounded-lg px-4 py-3 max-w-[80%]">
            <div className="text-sm text-dark-100 whitespace-pre-wrap">
              {streamingContent}
              <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
            </div>
          </div>
        </div>
      )}

      {/* Typing indicator */}
      {loading && !streaming && !status && messages[messages.length - 1]?.role !== 'assistant' && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
            <span className="text-white text-sm">🤖</span>
          </div>
          <div className="bg-dark-800 rounded-lg px-4 py-3">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}
