/**
 * Prompt 优化配置面板
 * 配置 Prompt 压缩策略和 Soul 注入策略
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  PromptOptimizerConfig,
  SoulInjectionStrategy,
  TaskType,
} from '@/types';
import {
  Zap,
  Settings2,
  Sparkles,
  MessageSquare,
  Code,
  Cpu,
  Users,
  Layers,
  Check,
  Save,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 任务类型配置项
 */
interface TaskTypeConfig {
  type: TaskType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const TASK_TYPES: TaskTypeConfig[] = [
  {
    type: 'quick',
    label: '快速问答',
    description: '简单问题，不需要工具',
    icon: <Zap size={16} />,
  },
  {
    type: 'simple',
    label: '简单操作',
    description: '单一工具调用',
    icon: <Settings2 size={16} />,
  },
  {
    type: 'standard',
    label: '标准任务',
    description: '需要多个工具',
    icon: <Cpu size={16} />,
  },
  {
    type: 'complex',
    label: '复杂任务',
    description: '多步骤规划和执行',
    icon: <Layers size={16} />,
  },
  {
    type: 'technical',
    label: '技术实现',
    description: '代码、调试、优化',
    icon: <Code size={16} />,
  },
  {
    type: 'creative',
    label: '创意生成',
    description: '内容创作',
    icon: <Sparkles size={16} />,
  },
  {
    type: 'conversation',
    label: '对话交互',
    description: '聊天、讨论',
    icon: <MessageSquare size={16} />,
  },
  {
    type: 'orchestrator',
    label: '多智能体编排',
    description: '协调多个子任务',
    icon: <Users size={16} />,
  },
];

/**
 * Soul 注入类型
 */
type SoulInjectionType = 'full' | 'identity' | 'none';

/**
 * 获取任务的 Soul 注入类型
 */
function getSoulInjectionType(
  taskType: TaskType,
  strategy: SoulInjectionStrategy | undefined | null
): SoulInjectionType {
  if (!strategy) return 'none';
  if (strategy.fullInjectionTypes?.includes(taskType)) return 'full';
  if (strategy.identityOnlyTypes?.includes(taskType)) return 'identity';
  return 'none';
}

/**
 * 任务类型卡片
 */
function TaskTypeCard({
  config,
  injectionType,
  onInjectionTypeChange,
}: {
  config: TaskTypeConfig;
  injectionType: SoulInjectionType;
  onInjectionTypeChange: (type: SoulInjectionType) => void;
}) {
  return (
    <div className="bg-dark-800 rounded-lg p-3 border border-dark-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-dark-400">{config.icon}</span>
        <span className="text-sm font-medium text-dark-100">{config.label}</span>
      </div>
      <p className="text-xs text-dark-500 mb-3">{config.description}</p>
      
      {/* Soul 注入选项 */}
      <div className="flex gap-1">
        <button
          onClick={() => onInjectionTypeChange('full')}
          className={cn(
            'flex-1 py-1 px-2 text-xs rounded transition-colors',
            injectionType === 'full'
              ? 'bg-blue-600 text-white'
              : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
          )}
        >
          完整人格
        </button>
        <button
          onClick={() => onInjectionTypeChange('identity')}
          className={cn(
            'flex-1 py-1 px-2 text-xs rounded transition-colors',
            injectionType === 'identity'
              ? 'bg-orange-600 text-white'
              : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
          )}
        >
          简短身份
        </button>
        <button
          onClick={() => onInjectionTypeChange('none')}
          className={cn(
            'flex-1 py-1 px-2 text-xs rounded transition-colors',
            injectionType === 'none'
              ? 'bg-gray-600 text-white'
              : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
          )}
        >
          不注入
        </button>
      </div>
    </div>
  );
}

/**
 * Prompt 优化配置面板主组件
 */
export function PromptOptimizerPanel() {
  const [config, setConfig] = useState<PromptOptimizerConfig>({
    enableCompression: true,
    maxSystemPromptChars: 4000,
    preferConcise: true,
  });
  const [strategy, setStrategy] = useState<SoulInjectionStrategy>({
    fullInjectionTypes: ['conversation', 'creative'],
    identityOnlyTypes: ['complex', 'technical', 'orchestrator'],
    noInjectionTypes: ['quick', 'simple', 'standard'],
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      // 加载优化配置
      const optimizerConfig = await window.zeroclaw.promptOptimizer?.getConfig?.();
      if (optimizerConfig) {
        setConfig(optimizerConfig);
      }

      // 加载 Soul 策略
      const soulStrategy = await window.zeroclaw.soul?.getDefaultStrategy?.();
      if (soulStrategy) {
        setStrategy(soulStrategy);
      }
    } catch (err) {
      console.error('Failed to load prompt config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 保存配置（目前 API 不支持保存，仅本地状态）
      console.log('Saving config:', config, strategy);
    } catch (err) {
      console.error('Failed to save prompt config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleInjectionTypeChange = (
    taskType: TaskType,
    injectionType: SoulInjectionType
  ) => {
    setStrategy((prev) => {
      const newStrategy = {
        fullInjectionTypes: prev.fullInjectionTypes.filter((t) => t !== taskType),
        identityOnlyTypes: prev.identityOnlyTypes.filter((t) => t !== taskType),
        noInjectionTypes: prev.noInjectionTypes.filter((t) => t !== taskType),
      };

      if (injectionType === 'full') {
        newStrategy.fullInjectionTypes.push(taskType);
      } else if (injectionType === 'identity') {
        newStrategy.identityOnlyTypes.push(taskType);
      } else {
        newStrategy.noInjectionTypes.push(taskType);
      }

      return newStrategy;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw size={24} className="text-dark-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 基础配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap size={18} />
            Prompt 优化配置
          </CardTitle>
          <CardDescription>
            配置 Prompt 压缩策略，减少 token 使用量
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 启用压缩 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-dark-100">启用压缩</div>
              <div className="text-xs text-dark-400">
                根据任务类型自动压缩非必要内容
              </div>
            </div>
            <button
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  enableCompression: !prev.enableCompression,
                }))
              }
              className={cn(
                'w-12 h-6 rounded-full transition-colors relative',
                config.enableCompression ? 'bg-blue-600' : 'bg-dark-600'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform',
                  config.enableCompression ? 'translate-x-6' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>

          {/* 最大字符数 */}
          <div>
            <label className="block text-sm font-medium text-dark-100 mb-1">
              最大系统提示字符数
            </label>
            <Input
              type="number"
              value={config.maxSystemPromptChars}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  maxSystemPromptChars: parseInt(e.target.value) || 4000,
                }))
              }
              className="w-32"
            />
            <p className="text-xs text-dark-500 mt-1">
              超过此长度将进行压缩
            </p>
          </div>

          {/* 优先简洁 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-dark-100">优先简洁</div>
              <div className="text-xs text-dark-400">
                优先使用简洁格式的提示词
              </div>
            </div>
            <button
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  preferConcise: !prev.preferConcise,
                }))
              }
              className={cn(
                'w-12 h-6 rounded-full transition-colors relative',
                config.preferConcise ? 'bg-blue-600' : 'bg-dark-600'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform',
                  config.preferConcise ? 'translate-x-6' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Soul 注入策略 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={18} />
            Soul 注入策略
          </CardTitle>
          <CardDescription>
            配置不同任务类型的 Soul 人格注入方式
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-600" />
              <span className="text-dark-400">完整人格</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-600" />
              <span className="text-dark-400">简短身份</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-gray-600" />
              <span className="text-dark-400">不注入</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {TASK_TYPES.map((taskConfig) => (
              <TaskTypeCard
                key={taskConfig.type}
                config={taskConfig}
                injectionType={getSoulInjectionType(taskConfig.type, strategy)}
                onInjectionTypeChange={(type) =>
                  handleInjectionTypeChange(taskConfig.type, type)
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <RefreshCw size={16} className="mr-2 animate-spin" />
          ) : (
            <Save size={16} className="mr-2" />
          )}
          {saving ? '保存中...' : '保存配置'}
        </Button>
      </div>
    </div>
  );
}
