import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles } from 'lucide-react';

interface PromptOptimizeDialogProps {
  isOpen: boolean;
  currentPrompt: string;
  agentName?: string;
  onOptimize: (prompt: string, requirements: string) => Promise<{ success: boolean; optimizedPrompt?: string; error?: string }>;
  onApply: (optimizedPrompt: string) => void;
  onClose: () => void;
}

export function PromptOptimizeDialog({ 
  isOpen, 
  currentPrompt, 
  agentName, 
  onOptimize, 
  onApply, 
  onClose 
}: PromptOptimizeDialogProps) {
  const [requirements, setRequirements] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOptimize = async () => {
    setOptimizing(true);
    setError(null);
    setOptimizedPrompt(null);

    try {
      const result = await onOptimize(currentPrompt, requirements);
      if (result.success && result.optimizedPrompt) {
        setOptimizedPrompt(result.optimizedPrompt);
      } else {
        setError(result.error || '优化失败');
      }
    } catch (err: any) {
      setError(err.message || '优化失败');
    } finally {
      setOptimizing(false);
    }
  };

  const handleApply = () => {
    if (optimizedPrompt) {
      onApply(optimizedPrompt);
      onClose();
    }
  };

  const handleReset = () => {
    setOptimizedPrompt(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[600px] max-h-[80vh] shadow-xl flex flex-col">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles size={20} className="text-blue-500" />
          优化 Prompt
        </h2>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* 当前 Prompt */}
          <div>
            <label className="text-xs text-dark-400 mb-1 block">当前 Prompt</label>
            <div className="p-3 bg-dark-900 rounded text-xs text-dark-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
              {currentPrompt || '(空)'}
            </div>
          </div>

          {/* 优化要求 */}
          <div>
            <label className="text-xs text-dark-400 mb-1 block">优化要求（可选）</label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="w-full h-20 px-3 py-2 bg-dark-700 border border-dark-600 rounded text-sm resize-none"
              placeholder="例如：更简洁、添加更多示例、强调安全性..."
            />
          </div>

          {/* 优化按钮 */}
          <Button
            onClick={handleOptimize}
            disabled={optimizing || !currentPrompt.trim()}
            className="w-full"
          >
            {optimizing ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                优化中...
              </>
            ) : (
              <>
                <Sparkles size={16} className="mr-2" />
                开始优化
              </>
            )}
          </Button>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-sm text-red-400">
              {error}
            </div>
          )}

          {/* 优化结果 */}
          {optimizedPrompt && (
            <div>
              <label className="text-xs text-dark-400 mb-1 block">优化结果</label>
              <div className="p-3 bg-dark-900 rounded text-xs text-dark-300 max-h-48 overflow-y-auto whitespace-pre-wrap border border-green-500/50">
                {optimizedPrompt}
              </div>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={handleReset}>
                  重新优化
                </Button>
                <Button size="sm" onClick={handleApply}>
                  应用此 Prompt
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end mt-4 pt-4 border-t border-dark-700">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}
