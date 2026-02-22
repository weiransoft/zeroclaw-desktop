import { useConfigStore, AgentConfig, AgentSoul } from '@/stores/configStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, Sparkles, Heart } from 'lucide-react';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PromptOptimizeDialog } from './PromptOptimizeDialog';
import { SoulEditor } from './SoulEditor';

interface AgentConfigEditorProps {
  agent: AgentConfig;
  providers: { id: string; name: string; models: string[]; enabled: boolean }[];
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (agent: AgentConfig) => void;
  onDelete: () => void;
}

function AgentConfigEditor({ agent, providers, isEditing, onStartEdit, onCancelEdit, onSave, onDelete }: AgentConfigEditorProps) {
  const [edited, setEdited] = useState<AgentConfig>(agent);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showOptimizeDialog, setShowOptimizeDialog] = useState(false);
  const [showSoulEditor, setShowSoulEditor] = useState(false);

  const enabledProviders = providers.filter(p => p.enabled);
  const selectedProvider = providers.find(p => p.id === (isEditing ? edited.providerId : agent.providerId));

  const handleOptimize = async (prompt: string, requirements: string) => {
    return window.zeroclaw.prompt.optimize(prompt, edited.name, requirements);
  };

  const handleApplyOptimized = (optimizedPrompt: string) => {
    setEdited({ ...edited, systemPrompt: optimizedPrompt });
  };

  const handleSoulChange = (soul: AgentSoul) => {
    setEdited({ ...edited, soul });
  };

  if (!isEditing) {
    return (
      <div className="p-4 bg-dark-800 rounded-lg border border-dark-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-dark-100">{agent.name}</span>
              <Badge variant={agent.enabled ? 'default' : 'outline'}>
                {agent.enabled ? '已启用' : '已禁用'}
              </Badge>
              {agent.fromConfig && (
                <Badge variant="outline" className="text-xs">来自配置</Badge>
              )}
              {agent.soul && (
                <Badge variant="outline" className="text-xs text-pink-400">
                  <Heart size={10} className="mr-1" />
                  灵魂
                </Badge>
              )}
            </div>
            <div className="text-xs text-dark-400 mb-2">
              {selectedProvider?.name || '未知供应商'} / {agent.model}
            </div>
            <div className="flex items-center gap-2 text-xs text-dark-400">
              <span>温度: {agent.temperature}</span>
              <span>深度: {agent.maxDepth}</span>
            </div>
            {agent.systemPrompt && (
              <div className="mt-2">
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="flex items-center gap-1 text-xs text-dark-400 hover:text-dark-200"
                >
                  {showPrompt ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  System Prompt ({agent.systemPrompt.length} 字符)
                </button>
                {showPrompt && (
                  <pre className="mt-1 p-2 bg-dark-900 rounded text-xs text-dark-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {agent.systemPrompt}
                  </pre>
                )}
              </div>
            )}
            {agent.soul && (
              <div className="mt-2 text-xs text-dark-400">
                <span className="text-pink-400">灵魂:</span> {agent.soul.nature.slice(0, 50)}...
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onStartEdit}>
              <Edit2 size={14} />
            </Button>
            {!agent.fromConfig && (
              <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-400 hover:text-red-300">
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 bg-dark-800 rounded-lg border border-blue-500">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-dark-400 mb-1 block">名称 *</label>
              <Input
                value={edited.name}
                onChange={(e) => setEdited({ ...edited, name: e.target.value })}
                className="h-8"
                placeholder="智能体名称"
                disabled={agent.fromConfig}
              />
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">显示名称</label>
              <Input
                value={edited.displayName || ''}
                onChange={(e) => setEdited({ ...edited, displayName: e.target.value })}
                className="h-8"
                placeholder="聊天中显示的名称"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-dark-400 mb-1 block">供应商</label>
              <select
                value={edited.providerId}
                onChange={(e) => {
                  const provider = providers.find(p => p.id === e.target.value);
                  setEdited({ 
                    ...edited, 
                    providerId: e.target.value,
                    model: provider?.models[0] || ''
                  });
                }}
                className="w-full h-8 px-2 bg-dark-700 border border-dark-600 rounded text-sm"
              >
                {enabledProviders.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">模型</label>
              <select
                value={edited.model}
                onChange={(e) => setEdited({ ...edited, model: e.target.value })}
                className="w-full h-8 px-2 bg-dark-700 border border-dark-600 rounded text-sm"
              >
                {selectedProvider?.models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">温度</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={edited.temperature}
                onChange={(e) => setEdited({ ...edited, temperature: parseFloat(e.target.value) || 0.7 })}
                className="h-8"
              />
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">最大深度</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={edited.maxDepth}
                onChange={(e) => setEdited({ ...edited, maxDepth: parseInt(e.target.value) || 3 })}
                className="h-8"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-dark-400">System Prompt</label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSoulEditor(!showSoulEditor)}
                  className={`h-6 text-xs ${showSoulEditor ? 'border-pink-500 text-pink-400' : ''}`}
                >
                  <Heart size={12} className="mr-1" />
                  灵魂
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowOptimizeDialog(true)}
                  disabled={!edited.systemPrompt.trim()}
                  className="h-6 text-xs"
                >
                  <Sparkles size={12} className="mr-1" />
                  优化
                </Button>
              </div>
            </div>
            <textarea
              value={edited.systemPrompt}
              onChange={(e) => setEdited({ ...edited, systemPrompt: e.target.value })}
              className="w-full h-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded text-sm resize-none"
              placeholder="输入智能体的系统提示词..."
            />
          </div>

          {/* Soul Editor */}
          {showSoulEditor && (
            <div className="p-3 bg-dark-900 rounded border border-dark-700">
              <SoulEditor
                soul={edited.soul}
                onChange={handleSoulChange}
                agentName={edited.name}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={edited.enabled}
              onChange={(e) => setEdited({ ...edited, enabled: e.target.checked })}
              className="rounded"
            />
            <label className="text-xs text-dark-400">启用此智能体</label>
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={onCancelEdit}>
              <X size={14} className="mr-1" /> 取消
            </Button>
            <Button size="sm" onClick={() => onSave(edited)} disabled={!edited.name}>
              <Check size={14} className="mr-1" /> 保存
            </Button>
          </div>
        </div>
      </div>

      <PromptOptimizeDialog
        isOpen={showOptimizeDialog}
        currentPrompt={edited.systemPrompt}
        agentName={edited.name}
        onOptimize={handleOptimize}
        onApply={handleApplyOptimized}
        onClose={() => setShowOptimizeDialog(false)}
      />
    </>
  );
}

export function AgentsConfig() {
  const { providers, agents, addAgent, updateAgent, removeAgent } = useConfigStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAgent, setNewAgent] = useState<Partial<AgentConfig> | null>(null);
  const [showOptimizeDialog, setShowOptimizeDialog] = useState(false);
  const [showSoulEditor, setShowSoulEditor] = useState(false);

  const enabledProviders = providers.filter(p => p.enabled);

  const startAddNew = () => {
    const defaultProvider = enabledProviders[0];
    setNewAgent({
      id: uuidv4(),
      name: '',
      providerId: defaultProvider?.id || '',
      model: defaultProvider?.models[0] || '',
      systemPrompt: '',
      temperature: 0.7,
      maxDepth: 3,
      enabled: true,
    });
  };

  const saveNewAgent = () => {
    if (newAgent && newAgent.name && newAgent.id) {
      addAgent(newAgent as AgentConfig);
      setNewAgent(null);
      setShowSoulEditor(false);
    }
  };

  const handleSave = (agent: AgentConfig) => {
    updateAgent(agent.id, agent);
    setEditingId(null);
  };

  const handleOptimizeNew = async (prompt: string, requirements: string) => {
    return window.zeroclaw.prompt.optimize(prompt, newAgent?.name, requirements);
  };

  const handleApplyOptimizedNew = (optimizedPrompt: string) => {
    if (newAgent) {
      setNewAgent({ ...newAgent, systemPrompt: optimizedPrompt });
    }
  };

  const handleSoulChangeNew = (soul: AgentSoul) => {
    if (newAgent) {
      setNewAgent({ ...newAgent, soul });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>智能体配置</CardTitle>
            <CardDescription>配置智能体的模型、提示词和行为参数</CardDescription>
          </div>
          <Button size="sm" onClick={startAddNew} disabled={enabledProviders.length === 0}>
            <Plus size={16} className="mr-2" />
            添加智能体
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {enabledProviders.length === 0 && (
          <div className="text-sm text-yellow-500 mb-4">
            请先启用至少一个 LLM 供应商
          </div>
        )}
        
        <div className="space-y-3">
          {agents.map((agent) => (
            <AgentConfigEditor
              key={agent.id}
              agent={agent}
              providers={providers}
              isEditing={editingId === agent.id}
              onStartEdit={() => setEditingId(agent.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={handleSave}
              onDelete={() => removeAgent(agent.id)}
            />
          ))}

          {newAgent && (
            <div className="p-4 bg-dark-800 rounded-lg border border-green-500">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-dark-400 mb-1 block">名称 *</label>
                    <Input
                      value={newAgent.name || ''}
                      onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                      className="h-8"
                      placeholder="智能体名称"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 mb-1 block">供应商</label>
                    <select
                      value={newAgent.providerId || ''}
                      onChange={(e) => {
                        const provider = providers.find(p => p.id === e.target.value);
                        setNewAgent({ 
                          ...newAgent, 
                          providerId: e.target.value,
                          model: provider?.models[0] || ''
                        });
                      }}
                      className="w-full h-8 px-2 bg-dark-700 border border-dark-600 rounded text-sm"
                    >
                      {enabledProviders.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-dark-400">System Prompt</label>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowSoulEditor(!showSoulEditor)}
                        className={`h-6 text-xs ${showSoulEditor ? 'border-pink-500 text-pink-400' : ''}`}
                      >
                        <Heart size={12} className="mr-1" />
                        灵魂
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowOptimizeDialog(true)}
                        disabled={!newAgent.systemPrompt?.trim()}
                        className="h-6 text-xs"
                      >
                        <Sparkles size={12} className="mr-1" />
                        优化
                      </Button>
                    </div>
                  </div>
                  <textarea
                    value={newAgent.systemPrompt || ''}
                    onChange={(e) => setNewAgent({ ...newAgent, systemPrompt: e.target.value })}
                    className="w-full h-24 px-3 py-2 bg-dark-700 border border-dark-600 rounded text-sm resize-none"
                    placeholder="输入智能体的系统提示词..."
                  />
                </div>

                {/* Soul Editor for new agent */}
                {showSoulEditor && (
                  <div className="p-3 bg-dark-900 rounded border border-dark-700">
                    <SoulEditor
                      soul={newAgent.soul}
                      onChange={handleSoulChangeNew}
                      agentName={newAgent.name}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setNewAgent(null); setShowSoulEditor(false); }}>
                    <X size={14} className="mr-1" /> 取消
                  </Button>
                  <Button size="sm" onClick={saveNewAgent} disabled={!newAgent.name}>
                    <Check size={14} className="mr-1" /> 添加
                  </Button>
                </div>
              </div>
            </div>
          )}

          {agents.length === 0 && !newAgent && (
            <div className="text-center py-8 text-dark-400">
              暂无智能体配置，点击"添加智能体"开始配置
            </div>
          )}
        </div>
      </CardContent>

      {newAgent && (
        <PromptOptimizeDialog
          isOpen={showOptimizeDialog}
          currentPrompt={newAgent.systemPrompt || ''}
          agentName={newAgent.name}
          onOptimize={handleOptimizeNew}
          onApply={handleApplyOptimizedNew}
          onClose={() => setShowOptimizeDialog(false)}
        />
      )}
    </Card>
  );
}
