import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';

describe('SettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      config: {
        theme: 'dark',
        language: 'zh',
        provider: 'openrouter',
        model: 'anthropic/claude-sonnet-4',
        apiKey: '',
        workspaceDir: '',
        autoSave: true,
        maxHistoryMessages: 100,
      },
      systemStatus: {
        running: false,
        sessionId: null,
        model: 'anthropic/claude-sonnet-4',
        provider: 'openrouter',
      },
      theme: 'dark',
      sidebarCollapsed: false,
    });
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useSettingsStore.getState();

      expect(state.config.theme).toBe('dark');
      expect(state.config.language).toBe('zh');
      expect(state.config.provider).toBe('openrouter');
      expect(state.systemStatus.running).toBe(false);
      expect(state.theme).toBe('dark');
      expect(state.sidebarCollapsed).toBe(false);
    });
  });

  describe('setConfig', () => {
    it('应该正确更新单个配置项', () => {
      useSettingsStore.getState().setConfig({ provider: 'anthropic' });

      expect(useSettingsStore.getState().config.provider).toBe('anthropic');
      // 其他配置应该保持不变
      expect(useSettingsStore.getState().config.model).toBe('anthropic/claude-sonnet-4');
    });

    it('应该正确更新多个配置项', () => {
      useSettingsStore.getState().setConfig({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
      });

      const config = useSettingsStore.getState().config;
      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-4');
      expect(config.apiKey).toBe('test-key');
    });

    it('应该保持未更新的配置项不变', () => {
      const originalConfig = { ...useSettingsStore.getState().config };

      useSettingsStore.getState().setConfig({ theme: 'light' });

      const config = useSettingsStore.getState().config;
      expect(config.language).toBe(originalConfig.language);
      expect(config.provider).toBe(originalConfig.provider);
      expect(config.autoSave).toBe(originalConfig.autoSave);
    });
  });

  describe('setSystemStatus', () => {
    it('应该正确设置系统状态', () => {
      useSettingsStore.getState().setSystemStatus({
        running: true,
        sessionId: 'session-123',
        model: 'gpt-4',
        provider: 'openai',
      });

      const status = useSettingsStore.getState().systemStatus;
      expect(status.running).toBe(true);
      expect(status.sessionId).toBe('session-123');
      expect(status.model).toBe('gpt-4');
    });

    it('应该正确更新token使用情况', () => {
      useSettingsStore.getState().setSystemStatus({
        running: true,
        sessionId: 'session-123',
        model: 'gpt-4',
        provider: 'openai',
        tokenUsage: {
          prompt: 100,
          completion: 50,
          total: 150,
        },
      });

      const status = useSettingsStore.getState().systemStatus;
      expect(status.tokenUsage).toBeDefined();
      expect(status.tokenUsage?.total).toBe(150);
    });
  });

  describe('setTheme', () => {
    it('应该正确设置主题为light', () => {
      useSettingsStore.getState().setTheme('light');

      expect(useSettingsStore.getState().theme).toBe('light');
    });

    it('应该正确设置主题为dark', () => {
      useSettingsStore.getState().setTheme('dark');

      expect(useSettingsStore.getState().theme).toBe('dark');
    });

    it('应该正确设置主题为system', () => {
      useSettingsStore.getState().setTheme('system');

      expect(useSettingsStore.getState().theme).toBe('system');
    });
  });

  describe('toggleSidebar', () => {
    it('应该正确切换侧边栏状态', () => {
      // 初始状态为展开
      expect(useSettingsStore.getState().sidebarCollapsed).toBe(false);

      // 切换为折叠
      useSettingsStore.getState().toggleSidebar();
      expect(useSettingsStore.getState().sidebarCollapsed).toBe(true);

      // 再次切换为展开
      useSettingsStore.getState().toggleSidebar();
      expect(useSettingsStore.getState().sidebarCollapsed).toBe(false);
    });
  });

  describe('配置验证测试', () => {
    it('应该支持所有有效的提供商', () => {
      const providers = ['openrouter', 'anthropic', 'openai', 'glm', 'gemini', 'ollama'];

      providers.forEach(provider => {
        useSettingsStore.getState().setConfig({ provider });
        expect(useSettingsStore.getState().config.provider).toBe(provider);
      });
    });

    it('应该支持所有有效的主题', () => {
      const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];

      themes.forEach(theme => {
        useSettingsStore.getState().setTheme(theme);
        expect(useSettingsStore.getState().theme).toBe(theme);
      });
    });

    it('应该支持所有有效的语言', () => {
      const languages: Array<'en' | 'zh'> = ['en', 'zh'];

      languages.forEach(language => {
        useSettingsStore.getState().setConfig({ language });
        expect(useSettingsStore.getState().config.language).toBe(language);
      });
    });
  });

  describe('边界情况测试', () => {
    it('应该正确处理空字符串配置', () => {
      useSettingsStore.getState().setConfig({
        apiKey: '',
        workspaceDir: '',
      });

      const config = useSettingsStore.getState().config;
      expect(config.apiKey).toBe('');
      expect(config.workspaceDir).toBe('');
    });

    it('应该正确处理长API Key', () => {
      const longApiKey = 'sk-' + 'a'.repeat(100);

      useSettingsStore.getState().setConfig({ apiKey: longApiKey });

      expect(useSettingsStore.getState().config.apiKey).toBe(longApiKey);
    });

    it('应该正确处理特殊字符路径', () => {
      const specialPath = '/path/with spaces/and-special_chars/';

      useSettingsStore.getState().setConfig({ workspaceDir: specialPath });

      expect(useSettingsStore.getState().config.workspaceDir).toBe(specialPath);
    });
  });

  describe('状态持久化测试', () => {
    it('多个状态更新应该正确保持其他状态', () => {
      // 同时更新多个状态
      useSettingsStore.getState().setConfig({ provider: 'anthropic' });
      useSettingsStore.getState().setTheme('light');
      useSettingsStore.getState().toggleSidebar();
      useSettingsStore.getState().setSystemStatus({
        running: true,
        sessionId: 'test',
        model: 'claude-3',
        provider: 'anthropic',
      });

      const state = useSettingsStore.getState();
      expect(state.config.provider).toBe('anthropic');
      expect(state.theme).toBe('light');
      expect(state.sidebarCollapsed).toBe(true);
      expect(state.systemStatus.running).toBe(true);
    });
  });
});
