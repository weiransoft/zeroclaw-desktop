import { useSettingsStore } from '@/stores/settingsStore';
import { Activity, Cpu, Zap } from 'lucide-react';

export function StatusBar() {
  const { systemStatus, config } = useSettingsStore();

  return (
    <footer className="h-7 bg-dark-900 border-t border-dark-700 flex items-center justify-between px-4 text-xs text-dark-400">
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              systemStatus.running ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span>{systemStatus.running ? '已连接' : '未连接'}</span>
        </div>

        {/* Model info */}
        <div className="flex items-center gap-1.5">
          <Cpu size={12} />
          <span>{config.model || '未设置模型'}</span>
        </div>

        {/* Provider */}
        <div className="flex items-center gap-1.5">
          <Zap size={12} />
          <span>{config.provider || '未设置提供商'}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Token usage */}
        {systemStatus.tokenUsage && (
          <div className="flex items-center gap-1.5">
            <Activity size={12} />
            <span>
              Tokens: {systemStatus.tokenUsage.total.toLocaleString()}
            </span>
          </div>
        )}

        {/* Version */}
        <span>ZeroClaw Desktop</span>
      </div>
    </footer>
  );
}
