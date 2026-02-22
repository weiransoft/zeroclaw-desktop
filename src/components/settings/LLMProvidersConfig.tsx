import { useConfigStore, LLMProvider } from '@/stores/configStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Eye, EyeOff, Check, X } from 'lucide-react';
import { useState } from 'react';

const PROVIDER_TYPES = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'glm', label: '智谱 GLM' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'custom', label: '自定义' },
];

export function LLMProvidersConfig() {
  const { providers, addProvider, updateProvider, removeProvider } = useConfigStore();
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editedProvider, setEditedProvider] = useState<Partial<LLMProvider>>({});
  const [newProvider, setNewProvider] = useState<Partial<LLMProvider> | null>(null);

  const toggleShowApiKey = (id: string) => {
    setShowApiKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startEdit = (provider: LLMProvider) => {
    setEditingProvider(provider.id);
    setEditedProvider({ ...provider });
  };

  const cancelEdit = () => {
    setEditingProvider(null);
    setEditedProvider({});
  };

  const saveEdit = (id: string) => {
    updateProvider(id, editedProvider);
    setEditingProvider(null);
    setEditedProvider({});
  };

  const startAddNew = () => {
    setNewProvider({
      id: `custom-${Date.now()}`,
      name: '',
      type: 'custom',
      apiKey: '',
      models: [],
      enabled: true,
    });
  };

  const saveNewProvider = () => {
    if (newProvider && newProvider.name && newProvider.id) {
      addProvider(newProvider as LLMProvider);
      setNewProvider(null);
    }
  };

  const updateNewProvider = (field: string, value: any) => {
    setNewProvider((prev) => prev ? { ...prev, [field]: value } : null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>LLM 供应商</CardTitle>
            <CardDescription>配置大语言模型供应商和 API 密钥</CardDescription>
          </div>
          <Button size="sm" onClick={startAddNew}>
            <Plus size={16} className="mr-2" />
            添加供应商
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="p-4 bg-dark-800 rounded-lg border border-dark-700"
            >
              {editingProvider === provider.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-dark-400 mb-1 block">名称</label>
                      <Input
                        value={editedProvider.name || ''}
                        onChange={(e) => setEditedProvider({ ...editedProvider, name: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 mb-1 block">类型</label>
                      <select
                        value={editedProvider.type || provider.type}
                        onChange={(e) => setEditedProvider({ ...editedProvider, type: e.target.value as LLMProvider['type'] })}
                        className="w-full h-8 px-2 bg-dark-700 border border-dark-600 rounded text-sm"
                      >
                        {PROVIDER_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 mb-1 block">API Key</label>
                    <Input
                      type="password"
                      value={editedProvider.apiKey || ''}
                      onChange={(e) => setEditedProvider({ ...editedProvider, apiKey: e.target.value })}
                      className="h-8"
                      placeholder="输入 API Key"
                    />
                  </div>
                  {provider.type === 'custom' && (
                    <div>
                      <label className="text-xs text-dark-400 mb-1 block">Base URL</label>
                      <Input
                        value={editedProvider.baseUrl || ''}
                        onChange={(e) => setEditedProvider({ ...editedProvider, baseUrl: e.target.value })}
                        className="h-8"
                        placeholder="https://api.example.com/v1"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-dark-400 mb-1 block">可用模型（逗号分隔）</label>
                    <Input
                      value={(editedProvider.models || []).join(', ')}
                      onChange={(e) => setEditedProvider({ ...editedProvider, models: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      className="h-8"
                      placeholder="model-1, model-2"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-dark-400">启用</label>
                    <input
                      type="checkbox"
                      checked={editedProvider.enabled ?? true}
                      onChange={(e) => setEditedProvider({ ...editedProvider, enabled: e.target.checked })}
                      className="rounded"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X size={14} className="mr-1" /> 取消
                    </Button>
                    <Button size="sm" onClick={() => saveEdit(provider.id)}>
                      <Check size={14} className="mr-1" /> 保存
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-dark-100">{provider.name}</span>
                      <Badge variant={provider.enabled ? 'default' : 'outline'}>
                        {provider.enabled ? '已启用' : '已禁用'}
                      </Badge>
                      <Badge variant="outline">{provider.type}</Badge>
                    </div>
                    <div className="text-xs text-dark-400 mb-2">
                      API Key: {provider.apiKey ? (
                        <span className="flex items-center gap-1">
                          {showApiKeys[provider.id] ? provider.apiKey : '••••••••••••'}
                          <button
                            onClick={() => toggleShowApiKey(provider.id)}
                            className="text-dark-400 hover:text-dark-200"
                          >
                            {showApiKeys[provider.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </span>
                      ) : (
                        <span className="text-yellow-500">未配置</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {provider.models.slice(0, 5).map((model) => (
                        <Badge key={model} variant="outline" className="text-xs">
                          {model}
                        </Badge>
                      ))}
                      {provider.models.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{provider.models.length - 5} 更多
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(provider)}>
                      编辑
                    </Button>
                    {provider.type === 'custom' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeProvider(provider.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {newProvider && (
            <div className="p-4 bg-dark-800 rounded-lg border border-blue-500">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-dark-400 mb-1 block">名称 *</label>
                    <Input
                      value={newProvider.name || ''}
                      onChange={(e) => updateNewProvider('name', e.target.value)}
                      className="h-8"
                      placeholder="供应商名称"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 mb-1 block">类型</label>
                    <select
                      value={newProvider.type || 'custom'}
                      onChange={(e) => updateNewProvider('type', e.target.value)}
                      className="w-full h-8 px-2 bg-dark-700 border border-dark-600 rounded text-sm"
                    >
                      {PROVIDER_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-dark-400 mb-1 block">API Key</label>
                  <Input
                    type="password"
                    value={newProvider.apiKey || ''}
                    onChange={(e) => updateNewProvider('apiKey', e.target.value)}
                    className="h-8"
                    placeholder="输入 API Key"
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-400 mb-1 block">Base URL（可选）</label>
                  <Input
                    value={newProvider.baseUrl || ''}
                    onChange={(e) => updateNewProvider('baseUrl', e.target.value)}
                    className="h-8"
                    placeholder="https://api.example.com/v1"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setNewProvider(null)}>
                    <X size={14} className="mr-1" /> 取消
                  </Button>
                  <Button size="sm" onClick={saveNewProvider} disabled={!newProvider.name}>
                    <Check size={14} className="mr-1" /> 添加
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
