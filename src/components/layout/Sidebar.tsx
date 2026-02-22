import { ReactNode } from 'react';
import { MessageSquare, Users, GitBranch, Settings, Menu, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settingsStore';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'chat', label: '对话', icon: MessageSquare },
  { id: 'swarm', label: '智能体', icon: Users },
  { id: 'workflow', label: '工作流', icon: GitBranch },
  { id: 'clawhub', label: '技能市场', icon: Package },
  { id: 'settings', label: '设置', icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebar } = useSettingsStore();

  return (
    <aside
      className={cn(
        'flex flex-col bg-dark-900 border-r border-dark-700 transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-[280px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-dark-700">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">Z</span>
            </div>
            <span className="font-semibold text-dark-100">ZeroClaw</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-dark-800 text-dark-400 hover:text-dark-100"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-dark-300 hover:bg-dark-800 hover:text-dark-100'
              )}
            >
              <Icon size={20} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-dark-700">
          <div className="text-xs text-dark-500">
            ZeroClaw Desktop v0.1.0
          </div>
        </div>
      )}
    </aside>
  );
}
