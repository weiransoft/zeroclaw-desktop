import { useConfigStore, AgentGroup, TeamMember } from '@/stores/configStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, Check, X, Sparkles, Users, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TeamMembersConfig } from './TeamMembersConfig';

export function AgentGroupsConfig() {
  const { agents, agentGroups, addAgentGroup, updateAgentGroup, removeAgentGroup } = useConfigStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedGroup, setEditedGroup] = useState<Partial<AgentGroup>>({});
  const [newGroup, setNewGroup] = useState<Partial<AgentGroup> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const enabledAgents = agents.filter(a => a.enabled);

  const toggleTeamExpand = (id: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startAddNew = () => {
    setNewGroup({
      id: uuidv4(),
      name: '',
      description: '',
      agents: [],
      autoGenerate: false,
      teamMembers: [],
    });
  };

  const saveNewGroup = () => {
    if (newGroup && newGroup.name && newGroup.id) {
      addAgentGroup(newGroup as AgentGroup);
      setNewGroup(null);
    }
  };

  const startEdit = (group: AgentGroup) => {
    setEditingId(group.id);
    setEditedGroup({ ...group });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditedGroup({});
  };

  const saveEdit = (id: string) => {
    updateAgentGroup(id, editedGroup);
    setEditingId(null);
    setEditedGroup({});
  };

  const handleAutoGenerate = async (groupId: string) => {
    setGenerating(true);
    try {
      const group = agentGroups.find(g => g.id === groupId);
      if (group?.generatePrompt) {
        const result = await window.zeroclaw.workflow.autoGenerate(group.generatePrompt);
        if (result) {
          console.log('Auto generated:', result);
        }
      }
    } catch (err) {
      console.error('Auto generate failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const toggleAgentInGroup = (agentId: string, groupAgents: string[], setAgents: (agents: string[]) => void) => {
    if (groupAgents.includes(agentId)) {
      setAgents(groupAgents.filter(id => id !== agentId));
    } else {
      setAgents([...groupAgents, agentId]);
    }
  };

  const countSoulMembers = (members?: TeamMember[]) => {
    return members?.filter(m => m.soul).length || 0;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>智能体群组</CardTitle>
            <CardDescription>配置智能体团队，为成员分配灵魂模板</CardDescription>
          </div>
          <Button size="sm" onClick={startAddNew}>
            <Plus size={16} className="mr-2" />
            添加群组
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {agentGroups.map((group) => (
            <div key={group.id} className="p-4 bg-dark-800 rounded-lg border border-dark-700">
              {editingId === group.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-dark-400 mb-1 block">群组名称 *</label>
                      <Input
                        value={editedGroup.name || ''}
                        onChange={(e) => setEditedGroup({ ...editedGroup, name: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 mb-1 block">描述</label>
                      <Input
                        value={editedGroup.description || ''}
                        onChange={(e) => setEditedGroup({ ...editedGroup, description: e.target.value })}
                        className="h-8"
                        placeholder="群组描述"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-dark-400 mb-2 block">选择智能体</label>
                    <div className="flex flex-wrap gap-2">
                      {enabledAgents.map((agent) => (
                        <Badge
                          key={agent.id}
                          variant={(editedGroup.agents || []).includes(agent.id) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleAgentInGroup(
                            agent.id, 
                            editedGroup.agents || [], 
                            (agents) => setEditedGroup({ ...editedGroup, agents })
                          )}
                        >
                          {agent.displayName || agent.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <TeamMembersConfig
                    members={editedGroup.teamMembers || []}
                    agents={agents}
                    onChange={(members) => setEditedGroup({ ...editedGroup, teamMembers: members })}
                  />

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editedGroup.autoGenerate || false}
                      onChange={(e) => setEditedGroup({ ...editedGroup, autoGenerate: e.target.checked })}
                      className="rounded"
                    />
                    <label className="text-xs text-dark-400">支持自动生成团队</label>
                  </div>
                  
                  {editedGroup.autoGenerate && (
                    <div>
                      <label className="text-xs text-dark-400 mb-1 block">生成提示词</label>
                      <textarea
                        value={editedGroup.generatePrompt || ''}
                        onChange={(e) => setEditedGroup({ ...editedGroup, generatePrompt: e.target.value })}
                        className="w-full h-20 px-3 py-2 bg-dark-700 border border-dark-600 rounded text-sm resize-none"
                        placeholder="描述需要什么样的团队..."
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X size={14} className="mr-1" /> 取消
                    </Button>
                    <Button size="sm" onClick={() => saveEdit(group.id)}>
                      <Check size={14} className="mr-1" /> 保存
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-dark-100">{group.name}</span>
                        {group.fromConfig && (
                          <Badge variant="outline" className="text-xs">来自配置</Badge>
                        )}
                        {group.autoGenerate && (
                          <Badge variant="outline" className="text-xs">
                            <Sparkles size={10} className="mr-1" />
                            自动生成
                          </Badge>
                        )}
                        {countSoulMembers(group.teamMembers) > 0 && (
                          <Badge variant="outline" className="text-xs text-pink-400 border-pink-400">
                            <Heart size={10} className="mr-1" />
                            {countSoulMembers(group.teamMembers)} 灵魂
                          </Badge>
                        )}
                      </div>
                      {group.description && (
                        <div className="text-xs text-dark-400 mt-1">{group.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {group.autoGenerate && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleAutoGenerate(group.id)}
                          disabled={generating}
                        >
                          <Sparkles size={14} className={generating ? 'animate-spin' : ''} />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => startEdit(group)}>
                        <Edit2 size={14} />
                      </Button>
                      {!group.fromConfig && (
                        <Button size="sm" variant="ghost" onClick={() => removeAgentGroup(group.id)} className="text-red-400">
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {group.agents.map((agentId) => {
                      const agent = agents.find(a => a.id === agentId);
                      return agent ? (
                        <Badge key={agentId} variant="outline" className="text-xs">
                          {agent.displayName || agent.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>

                  {group.teamMembers && group.teamMembers.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleTeamExpand(group.id)}
                        className="flex items-center gap-1 text-xs text-dark-400 hover:text-dark-200"
                      >
                        {expandedTeams.has(group.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        <Users size={12} />
                        团队成员 ({group.teamMembers.length})
                      </button>
                      {expandedTeams.has(group.id) && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {group.teamMembers.map((member) => (
                            <div key={member.id} className="p-2 bg-dark-900 rounded text-xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-dark-100">{member.name}</span>
                                  {member.soul && (
                                    <Heart size={10} className="text-pink-400" />
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs">{member.role}</Badge>
                              </div>
                              {member.soul && (
                                <div className="text-pink-400 mt-1">{member.soul.name}</div>
                              )}
                              {member.skills && member.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {member.skills.slice(0, 3).map((skill, i) => (
                                    <span key={i} className="text-dark-500">{skill}</span>
                                  ))}
                                  {member.skills.length > 3 && (
                                    <span className="text-dark-500">+{member.skills.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {newGroup && (
            <div className="p-4 bg-dark-800 rounded-lg border border-green-500">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-dark-400 mb-1 block">群组名称 *</label>
                    <Input
                      value={newGroup.name || ''}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                      className="h-8"
                      placeholder="例如：开发团队"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 mb-1 block">描述</label>
                    <Input
                      value={newGroup.description || ''}
                      onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                      className="h-8"
                      placeholder="群组描述"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-dark-400 mb-2 block">选择智能体</label>
                  <div className="flex flex-wrap gap-2">
                    {enabledAgents.map((agent) => (
                      <Badge
                        key={agent.id}
                        variant={(newGroup.agents || []).includes(agent.id) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleAgentInGroup(
                          agent.id, 
                          newGroup.agents || [], 
                          (agents) => setNewGroup({ ...newGroup, agents })
                        )}
                      >
                        {agent.displayName || agent.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <TeamMembersConfig
                  members={newGroup.teamMembers || []}
                  agents={agents}
                  onChange={(members) => setNewGroup({ ...newGroup, teamMembers: members })}
                />

                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setNewGroup(null)}>
                    <X size={14} className="mr-1" /> 取消
                  </Button>
                  <Button size="sm" onClick={saveNewGroup} disabled={!newGroup.name}>
                    <Check size={14} className="mr-1" /> 添加
                  </Button>
                </div>
              </div>
            </div>
          )}

          {agentGroups.length === 0 && !newGroup && (
            <div className="text-center py-8 text-dark-400">
              暂无智能体群组，点击"添加群组"开始配置
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
