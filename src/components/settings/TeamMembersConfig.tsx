import { useState, useEffect } from 'react';
import { TeamMember, AgentSoul, AgentConfig } from '@/stores/configStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Sparkles, 
  Bot, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  Edit2,
  User,
  X,
  Check,
  Loader2
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface SoulTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  soul: AgentSoul;
}

interface TeamMemberEditorProps {
  member: TeamMember;
  agents: AgentConfig[];
  onUpdate: (member: TeamMember) => void;
  onRemove: () => void;
}

export function TeamMemberEditor({
  member,
  agents,
  onUpdate,
  onRemove,
}: TeamMemberEditorProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(member.name);
  const [soulTemplates, setSoulTemplates] = useState<SoulTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (expanded && soulTemplates.length === 0) {
      loadSoulTemplates();
    }
  }, [expanded]);

  const loadSoulTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const templates = await window.zeroclaw.soulTemplates.list();
      setSoulTemplates(templates || []);
    } catch (err) {
      console.error('Failed to load soul templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const selectedAgent = agents.find(a => a.id === member.agentId);
  const selectedTemplate = soulTemplates.find(t => t.id === member.soulId);

  const handleNameSave = () => {
    onUpdate({ ...member, name: nameInput });
    setEditingName(false);
  };

  const handleSoulSelect = (templateId: string | undefined) => {
    const template = templateId ? soulTemplates.find(t => t.id === templateId) : undefined;
    onUpdate({
      ...member,
      soulId: templateId,
      soul: template?.soul,
    });
  };

  const handleAgentSelect = (agentId: string | undefined) => {
    onUpdate({ ...member, agentId });
  };

  const handleCustomPromptChange = (prompt: string) => {
    onUpdate({ ...member, customPrompt: prompt });
  };

  return (
    <div className="border border-dark-600 rounded-lg bg-dark-800 overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-dark-700"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            member.soul ? 'bg-gradient-to-br from-pink-500 to-purple-600' : 'bg-dark-600'
          }`}>
            {member.soul ? (
              <Sparkles size={18} className="text-white" />
            ) : (
              <User size={18} className="text-dark-300" />
            )}
          </div>
          <div>
            {editingName ? (
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <Input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="h-7 w-40"
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={handleNameSave}>
                  <Check size={14} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium text-dark-100">{member.name}</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0"
                  onClick={e => { e.stopPropagation(); setEditingName(true); }}
                >
                  <Edit2 size={12} />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-dark-400">
              <span>{member.role}</span>
              {selectedAgent && (
                <>
                  <span>·</span>
                  <span className="text-primary-400">{selectedAgent.displayName || selectedAgent.name}</span>
                </>
              )}
              {member.soul && (
                <>
                  <span>·</span>
                  <span className="text-pink-400">{member.soul.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {member.soul && (
            <Badge variant="outline" className="text-pink-400 border-pink-400">
              <Heart size={10} className="mr-1" />
              灵魂
            </Badge>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-red-400"
            onClick={e => { e.stopPropagation(); onRemove(); }}
          >
            <Trash2 size={14} />
          </Button>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-dark-600 p-4 space-y-4">
          {/* Role */}
          <div>
            <label className="text-xs text-dark-400 mb-1 block">角色</label>
            <Input
              value={member.role}
              onChange={e => onUpdate({ ...member, role: e.target.value })}
              placeholder="成员角色"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="text-xs text-dark-400 mb-1 block">技能</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {member.skills.map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                  <X 
                    size={10} 
                    className="ml-1 cursor-pointer" 
                    onClick={() => {
                      const newSkills = member.skills.filter((_, i) => i !== index);
                      onUpdate({ ...member, skills: newSkills });
                    }}
                  />
                </Badge>
              ))}
            </div>
            <Input
              placeholder="添加技能，按回车确认"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value && !member.skills.includes(value)) {
                    onUpdate({ ...member, skills: [...member.skills, value] });
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
          </div>

          {/* Agent Selection */}
          <div>
            <label className="text-xs text-dark-400 mb-1 block">绑定智能体</label>
            <select
              value={member.agentId || ''}
              onChange={e => handleAgentSelect(e.target.value || undefined)}
              className="w-full h-9 px-3 bg-dark-700 border border-dark-600 rounded text-sm"
            >
              <option value="">不绑定智能体</option>
              {agents.filter(a => a.enabled).map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.displayName || agent.name} ({agent.model})
                </option>
              ))}
            </select>
          </div>

          {/* Soul Selection */}
          <div>
            <label className="text-xs text-dark-400 mb-2 block">灵魂模板</label>
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={16} className="animate-spin mr-2" />
                <span className="text-sm text-dark-400">加载灵魂模板...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                <button
                  onClick={() => handleSoulSelect(undefined)}
                  className={`p-2 rounded-lg border text-left text-sm transition-all ${
                    !member.soulId
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center">
                      <Bot size={14} className="text-dark-400" />
                    </div>
                    <div>
                      <div className="font-medium text-dark-200">无灵魂</div>
                      <div className="text-xs text-dark-400">使用默认行为</div>
                    </div>
                  </div>
                </button>
                
                {soulTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleSoulSelect(template.id)}
                  className={`p-2 rounded-lg border text-left text-sm transition-all ${
                    member.soulId === template.id
                      ? 'border-pink-500 bg-pink-500/10'
                      : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                      <Sparkles size={14} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-dark-100 truncate">{template.name}</div>
                      <div className="text-xs text-dark-400 truncate">{template.category}</div>
                    </div>
                  </div>
                </button>
              ))}
              </div>
            )}
          </div>

          {/* Soul Preview */}
          {member.soul && (
            <div className="p-3 bg-dark-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Heart size={14} className="text-pink-400" />
                <span className="text-sm font-medium text-dark-100">{member.soul.name}</span>
              </div>
              <p className="text-xs text-dark-300 mb-2">{member.soul.nature}</p>
              <p className="text-xs text-dark-400">{member.soul.purpose}</p>
              {member.soul.coreBeliefs.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {member.soul.coreBeliefs.map((belief, i) => (
                    <Badge key={i} variant="outline" className="text-xs text-pink-300 border-pink-500/30">
                      {belief}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom Prompt */}
          <div>
            <label className="text-xs text-dark-400 mb-1 block">自定义提示词（可选）</label>
            <textarea
              value={member.customPrompt || ''}
              onChange={e => handleCustomPromptChange(e.target.value)}
              placeholder="为该成员添加特定的行为指令..."
              className="w-full h-20 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface TeamMembersConfigProps {
  members: TeamMember[];
  agents: AgentConfig[];
  onChange: (members: TeamMember[]) => void;
}

export function TeamMembersConfig({
  members,
  agents,
  onChange,
}: TeamMembersConfigProps) {
  const addMember = () => {
    const newMember: TeamMember = {
      id: uuidv4(),
      name: `成员 ${members.length + 1}`,
      role: '团队成员',
      skills: [],
    };
    onChange([...members, newMember]);
  };

  const updateMember = (index: number, member: TeamMember) => {
    const newMembers = [...members];
    newMembers[index] = member;
    onChange(newMembers);
  };

  const removeMember = (index: number) => {
    onChange(members.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-dark-200">团队成员</label>
        <Button size="sm" variant="outline" onClick={addMember}>
          <Plus size={14} className="mr-1" />
          添加成员
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="text-center text-dark-400 py-8 border border-dashed border-dark-600 rounded-lg">
          <User size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无团队成员</p>
          <p className="text-xs mt-1">点击上方按钮添加成员</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member, index) => (
            <TeamMemberEditor
              key={member.id}
              member={member}
              agents={agents}
              soulTemplates={soulTemplates}
              onUpdate={(m) => updateMember(index, m)}
              onRemove={() => removeMember(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
