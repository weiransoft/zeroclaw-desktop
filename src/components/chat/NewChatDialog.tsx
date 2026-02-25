import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConfigStore, AgentConfig, AgentGroup } from '@/stores/configStore';
import { Bot, Users, Sparkles, Check } from 'lucide-react';

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateSession: (options: {
    type: 'agent' | 'group';
    agentId?: string;
    groupId?: string;
    name?: string;
  }) => void;
}

export function NewChatDialog({ open, onClose, onCreateSession }: NewChatDialogProps) {
  const { agents, agentGroups } = useConfigStore();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [activeTab, setActiveTab] = useState<'agent' | 'group'>('agent');

  const enabledAgents = useMemo(
    () => agents.filter((a) => a.enabled),
    [agents]
  );

  const validGroups = useMemo(
    () => agentGroups.filter((g) => g.agents && g.agents.length > 0),
    [agentGroups]
  );

  const handleCreate = () => {
    if (activeTab === 'agent' && selectedAgent) {
      const agent = agents.find((a) => a.id === selectedAgent);
      onCreateSession({
        type: 'agent',
        agentId: selectedAgent,
        name: sessionName || `与 ${agent?.displayName || agent?.name} 的对话`,
      });
    } else if (activeTab === 'group' && selectedGroup) {
      const group = agentGroups.find((g) => g.id === selectedGroup);
      onCreateSession({
        type: 'group',
        groupId: selectedGroup,
        name: sessionName || `${group?.name} 群聊`,
      });
    }
    
    setSelectedAgent(null);
    setSelectedGroup(null);
    setSessionName('');
    onClose();
  };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
    setActiveTab('agent');
  };

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroup(groupId);
    setActiveTab('group');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-dark-800 border-dark-600">
        <DialogHeader>
          <DialogTitle className="text-dark-100">新建对话</DialogTitle>
          <DialogDescription className="text-dark-400">
            选择一个智能体或群组开始新对话
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-dark-300 mb-1 block">对话名称（可选）</label>
            <Input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="输入对话名称"
              className="bg-dark-700 border-dark-600"
            />
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'agent' | 'group')}>
            <TabsList className="grid w-full grid-cols-2 bg-dark-700">
              <TabsTrigger value="agent" className="data-[state=active]:bg-primary-600">
                <Bot size={14} className="mr-2" />
                单个智能体
              </TabsTrigger>
              <TabsTrigger value="group" className="data-[state=active]:bg-primary-600">
                <Users size={14} className="mr-2" />
                智能体群组
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agent" className="mt-4">
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {enabledAgents.length === 0 ? (
                  <div className="col-span-2 text-center text-dark-400 py-8">
                    暂无启用的智能体
                  </div>
                ) : (
                  enabledAgents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      selected={selectedAgent === agent.id}
                      onClick={() => handleAgentSelect(agent.id)}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="group" className="mt-4">
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                {validGroups.length === 0 ? (
                  <div className="text-center text-dark-400 py-8">
                    暂无可用的智能体群组
                    <p className="text-xs mt-1">请先在设置中创建群组</p>
                  </div>
                ) : (
                  validGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      agents={agents}
                      selected={selectedGroup === group.id}
                      onClick={() => handleGroupSelect(group.id)}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t border-dark-600">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                (activeTab === 'agent' && !selectedAgent) ||
                (activeTab === 'group' && !selectedGroup)
              }
            >
              创建对话
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AgentCard({
  agent,
  selected,
  onClick,
}: {
  agent: AgentConfig;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border text-left transition-all ${
        selected
          ? 'border-primary-500 bg-primary-500/10'
          : 'border-dark-600 bg-dark-700 hover:border-dark-500'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
          {agent.soul ? (
            <Sparkles size={14} className="text-white" />
          ) : (
            <Bot size={14} className="text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-dark-100 truncate">
              {agent.displayName || agent.name}
            </span>
            {selected && <Check size={14} className="text-primary-400" />}
          </div>
          <div className="text-xs text-dark-400 truncate">{agent.model}</div>
        </div>
      </div>
    </button>
  );
}

function GroupCard({
  group,
  agents,
  selected,
  onClick,
}: {
  group: AgentGroup;
  agents: AgentConfig[];
  selected: boolean;
  onClick: () => void;
}) {
  const groupAgents = agents.filter((a) => group.agents.includes(a.id));

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border text-left transition-all ${
        selected
          ? 'border-primary-500 bg-primary-500/10'
          : 'border-dark-600 bg-dark-700 hover:border-dark-500'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shrink-0">
          <Users size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-dark-100">{group.name}</span>
            {selected && <Check size={14} className="text-primary-400" />}
          </div>
          <div className="text-xs text-dark-400">
            {groupAgents.length} 个智能体
            {group.description && ` · ${group.description}`}
          </div>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {groupAgents.slice(0, 4).map((agent) => (
              <span
                key={agent.id}
                className="text-xs px-1.5 py-0.5 bg-dark-600 rounded text-dark-300"
              >
                {agent.displayName || agent.name}
              </span>
            ))}
            {groupAgents.length > 4 && (
              <span className="text-xs text-dark-400">
                +{groupAgents.length - 4}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
