import { Send, Square, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

interface InputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  onAbort: () => void;
  loading: boolean;
  streaming: boolean;
}

export function InputBar({
  value,
  onChange,
  onSend,
  onAbort,
  loading,
  streaming,
}: InputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && value.trim()) {
        onSend(value);
      }
    }
  };

  const handleSend = () => {
    if (value.trim()) {
      onSend(value);
    }
  };

  return (
    <div className="border-t border-dark-700 p-4 bg-dark-900">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Shift+Enter 换行)"
            className={cn(
              'w-full resize-none rounded-lg border border-dark-600 bg-dark-800 px-4 py-3 pr-12',
              'text-dark-100 placeholder:text-dark-400',
              'focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500',
              'min-h-[48px] max-h-[200px]'
            )}
            rows={1}
            disabled={loading && !streaming}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {streaming ? (
            <Button
              onClick={onAbort}
              variant="destructive"
              size="icon"
              className="shrink-0"
            >
              <Square size={18} />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!value.trim() || loading}
              size="icon"
              className="shrink-0"
            >
              <Send size={18} />
            </Button>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between mt-2 text-xs text-dark-500">
        <span>
          {loading
            ? streaming
              ? '正在生成...'
              : '处理中...'
            : '按 Enter 发送'}
        </span>
        <span>
          {value.length} 字符
        </span>
      </div>
    </div>
  );
}
