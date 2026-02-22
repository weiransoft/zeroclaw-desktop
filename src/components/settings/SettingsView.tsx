import { useSettingsStore } from '@/stores/settingsStore';
import { useConfigStore } from '@/stores/configStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Play, Square, RefreshCw, Moon, Sun, Monitor, FolderOpen, Cog, Workflow, Bot, Layers, Coins, Server } from 'lucide-react';
import { useState, useEffect } from 'react';
import { LLMProvidersConfig } from './LLMProvidersConfig';
import { AgentsConfig } from './AgentsConfig';
import { AgentGroupsConfig } from './AgentGroupsConfig';
import { TokenUsageStats } from '@/components/stats/TokenUsageStats';
import { MCPServerList } from '@/components/mcp/MCPServerList';

type SettingsTab = 'providers' | 'agents' | 'groups' | 'mcp' | 'system' | 'appearance' | 'stats';

export function SettingsView() {
  const { config, systemStatus, setConfig, setSystemStatus, theme, setTheme } = useSettingsStore();
  const { loadFromDatabase, saveToDatabase } = useConfigStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers');
  const [localConfig, setLocalConfig] = useState(config);
  const [logs, setLogs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [zeroclawConfig, setZeroclawConfig] = useState<any>(null);
  const [zeroclawConfigPath, setZeroclawConfigPath] = useState<string | null>(null);
  const [workflowRoles, setWorkflowRoles] = useState<string[]>([]);

  useEffect(() => {
    loadConfig();
    loadStatus();
    loadZeroclawConfig();
    loadFromDatabase();

    const initLogs = [
      { level: 'info', message: 'ZeroClaw Desktop 已启动', timestamp: Date.now() },
    ];
    setLogs(initLogs);

    const unsubscribe = window.zeroclaw.system.onLog((log: any) => {
      console.log('Received log:', log);
      setLogs((prev) => [...prev.slice(-100), { ...log, timestamp: log.timestamp || Date.now() }]);
    });

    const checkStatus = async () => {
      try {
        const status = await window.zeroclaw.system.getStatus();
        const pairingStatus = await window.zeroclaw.system.getPairingStatus();
        
        setLogs((prev) => {
          const lastLog = prev[prev.length - 1];
          if (lastLog?.message?.includes('Gateway 状态')) {
            return prev;
          }
          const newLog = { 
            level: pairingStatus.isPaired ? 'info' : 'warn', 
            message: `Gateway: ${status.gatewayAvailable ? '已连接' : '未连接'}, 配对: ${pairingStatus.isPaired ? '已配对' : '未配对'}`, 
            timestamp: Date.now() 
          };
          return [...prev.slice(-99), newLog];
        });
      } catch (err) {
        console.error('Status check error:', err);
        setLogs((prev) => [...prev.slice(-99), { level: 'error', message: `状态检查失败: ${err}`, timestamp: Date.now() }]);
      }
    };

    checkStatus();
    const statusInterval = setInterval(checkStatus, 30000);

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await window.zeroclaw.system.getConfig();
      setLocalConfig({ ...config, ...cfg });
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const loadStatus = async () => {
    try {
      const status = await window.zeroclaw.system.getStatus();
      setSystemStatus(status);
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  };

  const loadZeroclawConfig = async () => {
    try {
      const summary = await window.zeroclaw.zeroclaw.getConfigSummary();
      setZeroclawConfig(summary);
      
      const path = await window.zeroclaw.zeroclaw.getConfigPath();
      setZeroclawConfigPath(path);
      
      const roles = await window.zeroclaw.workflow.getRoles();
      setWorkflowRoles(roles);
    } catch (err) {
      console.error('Failed to load ZeroClaw config:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await window.zeroclaw.system.setConfig(localConfig);
      setConfig(localConfig);
      await saveToDatabase();
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async () => {
    try {
      await window.zeroclaw.system.startZeroClaw();
      loadStatus();
    } catch (err) {
      console.error('Failed to start ZeroClaw:', err);
    }
  };

  const handleStop = async () => {
    try {
      await window.zeroclaw.system.stopZeroClaw();
      loadStatus();
    } catch (err) {
      console.error('Failed to stop ZeroClaw:', err);
    }
  };

  const handleSelectConfig = async () => {
    try {
      const result = await window.zeroclaw.zeroclaw.selectConfigFile();
      if (result.success) {
        await loadZeroclawConfig();
      }
    } catch (err) {
      console.error('Failed to select config:', err);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'providers', label: 'LLM 供应商', icon: <Cog size={16} /> },
    { id: 'agents', label: '智能体', icon: <Bot size={16} /> },
    { id: 'groups', label: '智能体群组', icon: <Layers size={16} /> },
    { id: 'mcp', label: 'MCP 服务器', icon: <Server size={16} /> },
    { id: 'stats', label: '消耗统计', icon: <Coins size={16} /> },
    { id: 'system', label: '系统', icon: <Workflow size={16} /> },
    { id: 'appearance', label: '外观', icon: <Monitor size={16} /> },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'providers':
        return <LLMProvidersConfig />;
      case 'agents':
        return <AgentsConfig />;
      case 'groups':
        return <AgentGroupsConfig />;
      case 'mcp':
        return <MCPServerList />;
      case 'stats':
        return (
          <div className="space-y-6">
            <TokenUsageStats />
          </div>
        );
      case 'system':
        return (
          <div className="space-y-6">
            {/* ZeroClaw Config */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog size={18} />
                  ZeroClaw 配置文件
                </CardTitle>
                <CardDescription>ZeroClaw 配置文件路径</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-1">
                    配置文件路径
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={zeroclawConfigPath || '未找到配置文件'}
                      readOnly
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={handleSelectConfig}>
                      <FolderOpen size={16} className="mr-2" />
                      选择
                    </Button>
                  </div>
                </div>

                {zeroclawConfig && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-dark-800 rounded-lg p-3">
                      <div className="text-xs text-dark-400 mb-1">提供商</div>
                      <div className="text-sm font-medium text-dark-100">
                        {zeroclawConfig.provider}
                      </div>
                    </div>
                    <div className="bg-dark-800 rounded-lg p-3">
                      <div className="text-xs text-dark-400 mb-1">模型</div>
                      <div className="text-sm font-medium text-dark-100">
                        {zeroclawConfig.model}
                      </div>
                    </div>
                    <div className="bg-dark-800 rounded-lg p-3">
                      <div className="text-xs text-dark-400 mb-1">API Key</div>
                      <div className="text-sm font-medium text-dark-100">
                        {zeroclawConfig.hasApiKey ? '已配置' : '未配置'}
                      </div>
                    </div>
                    <div className="bg-dark-800 rounded-lg p-3">
                      <div className="text-xs text-dark-400 mb-1">智能体数量</div>
                      <div className="text-sm font-medium text-dark-100">
                        {zeroclawConfig.agentCount}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>系统状态</CardTitle>
                <CardDescription>ZeroClaw 运行状态</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        systemStatus.running ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <span className="text-dark-100">
                      {systemStatus.running ? '运行中' : '已停止'}
                    </span>
                    {systemStatus.gatewayAvailable && (
                      <Badge variant="outline">Gateway 已连接</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {systemStatus.running ? (
                      <Button variant="destructive" onClick={handleStop}>
                        <Square size={16} className="mr-2" />
                        停止
                      </Button>
                    ) : (
                      <Button onClick={handleStart}>
                        <Play size={16} className="mr-2" />
                        启动
                      </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={loadStatus}>
                      <RefreshCw size={16} />
                    </Button>
                  </div>
                </div>
                
                {/* Manual Token Input */}
                <div className="mt-4 pt-4 border-t border-dark-700">
                  <label className="text-xs text-dark-400 mb-2 block">Bearer Token (手动设置)</label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="zc_xxxx..."
                      className="flex-1 h-8"
                      id="token-input"
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={async () => {
                        const input = document.getElementById('token-input') as HTMLInputElement;
                        const token = input?.value;
                        console.log('Token input submitted');
                        console.log('window.zeroclaw:', window.zeroclaw);
                        console.log('window.zeroclaw.system:', window.zeroclaw?.system);
                        
                        if (!token) {
                          setLogs((prev) => [...prev, { level: 'error', message: '请输入 Token', timestamp: Date.now() }]);
                          return;
                        }
                        
                        if (!window.zeroclaw?.system?.setToken) {
                          setLogs((prev) => [...prev, { level: 'error', message: 'setToken 方法不可用', timestamp: Date.now() }]);
                          return;
                        }
                        
                        try {
                          console.log('Calling setToken...');
                          const result = await window.zeroclaw.system.setToken(token);
                          console.log('setToken result:', result);
                          if (result.success) {
                            setLogs((prev) => [...prev, { level: 'info', message: 'Token 设置成功', timestamp: Date.now() }]);
                            loadStatus();
                          } else {
                            setLogs((prev) => [...prev, { level: 'error', message: result.message, timestamp: Date.now() }]);
                          }
                        } catch (err) {
                          console.error('setToken error:', err);
                          setLogs((prev) => [...prev, { level: 'error', message: `Token 设置失败: ${err}`, timestamp: Date.now() }]);
                        }
                      }}
                    >
                      设置
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workflow Roles */}
            {workflowRoles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow size={18} />
                    工作流角色
                  </CardTitle>
                  <CardDescription>从 ZeroClaw 配置文件加载的工作流角色</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {workflowRoles.map((role) => (
                      <Badge key={role} variant="default">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Logs */}
            <Card>
              <CardHeader>
                <CardTitle>日志</CardTitle>
                <CardDescription>系统运行日志</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-dark-800 rounded-lg p-3 h-64 overflow-y-auto font-mono text-xs">
                  {logs.length === 0 ? (
                    <div className="text-dark-500">暂无日志</div>
                  ) : (
                    logs.map((log, index) => (
                      <div
                        key={index}
                        className={`py-0.5 ${
                          log.level === 'error'
                            ? 'text-red-400'
                            : log.level === 'warn'
                            ? 'text-yellow-400'
                            : log.level === 'debug'
                            ? 'text-dark-400'
                            : 'text-dark-200'
                        }`}
                      >
                        [{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}] {log.message}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'appearance':
        return (
          <Card>
            <CardHeader>
              <CardTitle>外观</CardTitle>
              <CardDescription>自定义界面外观</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                >
                  <Sun size={14} className="mr-2" />
                  浅色
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                >
                  <Moon size={14} className="mr-2" />
                  深色
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('system')}
                >
                  <Monitor size={14} className="mr-2" />
                  系统
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Tab Navigation */}
        <div className="flex border-b border-dark-700 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-blue-400'
                  : 'text-dark-400 border-transparent hover:text-dark-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? '保存中...' : '保存所有设置'}
          </Button>
        </div>
      </div>
    </div>
  );
}
