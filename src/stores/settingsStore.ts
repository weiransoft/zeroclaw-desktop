import { create } from 'zustand';
import { AppConfig, SystemStatus } from '@/types';

interface SettingsStore {
  config: AppConfig;
  systemStatus: SystemStatus;
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;

  // Actions
  setConfig: (config: Partial<AppConfig>) => void;
  setSystemStatus: (status: SystemStatus) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
}

const defaultConfig: AppConfig = {
  theme: 'dark',
  language: 'zh',
  provider: 'openrouter',
  model: 'anthropic/claude-sonnet-4',
  apiKey: '',
  workspaceDir: '',
  autoSave: true,
  maxHistoryMessages: 100,
};

const defaultStatus: SystemStatus = {
  running: false,
  sessionId: null,
  model: 'anthropic/claude-sonnet-4',
  provider: 'openrouter',
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  config: defaultConfig,
  systemStatus: defaultStatus,
  theme: 'dark',
  sidebarCollapsed: false,

  setConfig: (config) => set((state) => ({ 
    config: { ...state.config, ...config } 
  })),
  setSystemStatus: (status) => set({ systemStatus: status }),
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ 
    sidebarCollapsed: !state.sidebarCollapsed 
  })),
}));
