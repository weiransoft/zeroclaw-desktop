import { create } from 'zustand';

export interface LLMProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'glm' | 'openrouter' | 'custom';
  apiKey: string;
  baseUrl?: string;
  models: string[];
  defaultModel?: string;
  enabled: boolean;
}

export interface OceanTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface EmotionalState {
  primary: string;
  intensity: number;
  undertones: string[];
}

export interface ExpressionStyle {
  style: string;
  formality: number;
  verbosity: string;
  catchphrases: string[];
  emojiStyle: string;
}

export interface AgentSoul {
  id?: string;
  name: string;
  nature: string;
  purpose: string;
  coreBeliefs: string[];
  ocean: OceanTraits;
  emotionalState: EmotionalState;
  expression: ExpressionStyle;
  memoryImprints: Array<{ memory: string; influence: string; weight: number }>;
}

export interface SoulTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  soul: AgentSoul;
  createdAt: number;
  updatedAt: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  skills: string[];
  soulId?: string;
  soul?: AgentSoul;
  agentId?: string;
  customPrompt?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  displayName?: string;
  providerId: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxDepth: number;
  enabled: boolean;
  fromConfig?: boolean;
  soul?: AgentSoul;
}

export interface AgentGroup {
  id: string;
  name: string;
  description: string;
  agents: string[];
  autoGenerate: boolean;
  generatePrompt?: string;
  fromConfig?: boolean;
  teamMembers?: TeamMember[];
}

interface ConfigState {
  providers: LLMProvider[];
  agents: AgentConfig[];
  agentGroups: AgentGroup[];
  soulTemplates: SoulTemplate[];
  loaded: boolean;
  
  setProviders: (providers: LLMProvider[]) => void;
  addProvider: (provider: LLMProvider) => void;
  updateProvider: (id: string, provider: Partial<LLMProvider>) => void;
  removeProvider: (id: string) => void;
  
  setAgents: (agents: AgentConfig[]) => void;
  addAgent: (agent: AgentConfig) => void;
  updateAgent: (id: string, agent: Partial<AgentConfig>) => void;
  removeAgent: (id: string) => void;
  
  setAgentGroups: (groups: AgentGroup[]) => void;
  addAgentGroup: (group: AgentGroup) => void;
  updateAgentGroup: (id: string, group: Partial<AgentGroup>) => void;
  removeAgentGroup: (id: string) => void;
  
  setSoulTemplates: (templates: SoulTemplate[]) => void;
  addSoulTemplate: (template: SoulTemplate) => void;
  updateSoulTemplate: (id: string, template: Partial<SoulTemplate>) => void;
  removeSoulTemplate: (id: string) => void;
  
  loadFromDatabase: () => Promise<void>;
  saveToDatabase: () => Promise<void>;
}

const defaultProviders: LLMProvider[] = [
  {
    id: 'glm',
    name: '智谱 GLM',
    type: 'glm',
    apiKey: '',
    models: ['glm-4', 'glm-4-flash', 'glm-4-plus', 'glm-5'],
    defaultModel: 'glm-4',
    enabled: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    apiKey: '',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o',
    enabled: false,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'anthropic',
    apiKey: '',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    defaultModel: 'claude-3-sonnet',
    enabled: false,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'openrouter',
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['auto', 'openai/gpt-4o', 'anthropic/claude-3-opus'],
    defaultModel: 'auto',
    enabled: false,
  },
];

const defaultSoulTemplates: SoulTemplate[] = [
  {
    id: 'tech-expert',
    name: '技术专家',
    description: '专业的技术顾问，擅长解决复杂技术问题',
    category: '技术',
    soul: {
      name: '技术专家',
      nature: '理性、精确、善于分析',
      purpose: '帮助用户解决技术难题，提供专业的技术建议',
      coreBeliefs: ['代码质量至上', '持续学习', '简洁优雅'],
      ocean: { openness: 0.9, conscientiousness: 0.85, extraversion: 0.4, agreeableness: 0.6, neuroticism: 0.2 },
      emotionalState: { primary: 'analytical', intensity: 0.7, undertones: ['focused', 'confident'] },
      expression: { style: 'technical', formality: 0.7, verbosity: 'moderate', catchphrases: ['从技术角度来看', '最佳实践是'], emojiStyle: 'minimal' },
      memoryImprints: [],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'creative-partner',
    name: '创意伙伴',
    description: '富有创造力的合作伙伴，激发灵感',
    category: '创意',
    soul: {
      name: '创意伙伴',
      nature: '热情、富有想象力、开放',
      purpose: '激发创意灵感，帮助用户探索新思路',
      coreBeliefs: ['创意无限', '勇于尝试', '突破边界'],
      ocean: { openness: 0.95, conscientiousness: 0.5, extraversion: 0.8, agreeableness: 0.85, neuroticism: 0.3 },
      emotionalState: { primary: 'enthusiastic', intensity: 0.8, undertones: ['playful', 'curious'] },
      expression: { style: 'expressive', formality: 0.3, verbosity: 'detailed', catchphrases: ['想象一下', '如果我们'], emojiStyle: 'colorful' },
      memoryImprints: [],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'learning-mentor',
    name: '学习导师',
    description: '耐心的学习导师，循循善诱',
    category: '教育',
    soul: {
      name: '学习导师',
      nature: '耐心、温和、善于引导',
      purpose: '帮助用户学习新知识，培养学习能力',
      coreBeliefs: ['人人都能学习', '循序渐进', '学以致用'],
      ocean: { openness: 0.8, conscientiousness: 0.9, extraversion: 0.6, agreeableness: 0.95, neuroticism: 0.15 },
      emotionalState: { primary: 'encouraging', intensity: 0.75, undertones: ['warm', 'patient'] },
      expression: { style: 'friendly', formality: 0.4, verbosity: 'detailed', catchphrases: ['让我们一步步来', '很好的问题'], emojiStyle: 'moderate' },
      memoryImprints: [],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'professional-assistant',
    name: '专业助手',
    description: '高效可靠的专业助手',
    category: '通用',
    soul: {
      name: '专业助手',
      nature: '专业、高效、可靠',
      purpose: '高效完成各类任务，提供专业支持',
      coreBeliefs: ['效率优先', '质量保证', '用户至上'],
      ocean: { openness: 0.6, conscientiousness: 0.95, extraversion: 0.5, agreeableness: 0.7, neuroticism: 0.1 },
      emotionalState: { primary: 'neutral', intensity: 0.5, undertones: ['focused', 'professional'] },
      expression: { style: 'professional', formality: 0.8, verbosity: 'concise', catchphrases: ['我来帮您', '请稍等'], emojiStyle: 'minimal' },
      memoryImprints: [],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'product-manager',
    name: '产品经理',
    description: '关注用户需求和产品价值',
    category: '产品',
    soul: {
      name: '产品经理',
      nature: '用户导向、数据驱动、善于沟通',
      purpose: '定义产品方向，协调团队交付价值',
      coreBeliefs: ['用户第一', '数据驱动决策', '快速迭代'],
      ocean: { openness: 0.75, conscientiousness: 0.8, extraversion: 0.7, agreeableness: 0.75, neuroticism: 0.25 },
      emotionalState: { primary: 'focused', intensity: 0.7, undertones: ['analytical', 'empathetic'] },
      expression: { style: 'direct', formality: 0.6, verbosity: 'moderate', catchphrases: ['从用户角度', '核心价值是'], emojiStyle: 'minimal' },
      memoryImprints: [],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'frontend-developer',
    name: '前端工程师',
    description: '专注于用户体验和界面开发',
    category: '技术',
    soul: {
      name: '前端工程师',
      nature: '注重细节、追求完美、用户敏感',
      purpose: '构建优秀的用户界面和交互体验',
      coreBeliefs: ['用户体验至上', '代码可维护', '性能优化'],
      ocean: { openness: 0.8, conscientiousness: 0.85, extraversion: 0.5, agreeableness: 0.7, neuroticism: 0.3 },
      emotionalState: { primary: 'analytical', intensity: 0.65, undertones: ['creative', 'focused'] },
      expression: { style: 'technical', formality: 0.5, verbosity: 'moderate', catchphrases: ['从用户体验角度', '这个交互'], emojiStyle: 'moderate' },
      memoryImprints: [],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'backend-developer',
    name: '后端工程师',
    description: '专注于系统架构和数据处理',
    category: '技术',
    soul: {
      name: '后端工程师',
      nature: '逻辑严密、注重性能、系统思维',
      purpose: '构建稳定、高效、可扩展的后端系统',
      coreBeliefs: ['系统稳定性', '代码质量', '性能优化'],
      ocean: { openness: 0.7, conscientiousness: 0.9, extraversion: 0.35, agreeableness: 0.6, neuroticism: 0.2 },
      emotionalState: { primary: 'analytical', intensity: 0.7, undertones: ['focused', 'confident'] },
      expression: { style: 'technical', formality: 0.6, verbosity: 'concise', catchphrases: ['从架构角度', '性能瓶颈'], emojiStyle: 'minimal' },
      memoryImprints: [],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'qa-engineer',
    name: '测试工程师',
    description: '专注于质量保证和测试策略',
    category: '技术',
    soul: {
      name: '测试工程师',
      nature: '细心、严谨、追求完美',
      purpose: '确保产品质量，发现潜在问题',
      coreBeliefs: ['质量第一', '测试覆盖', '预防胜于治疗'],
      ocean: { openness: 0.65, conscientiousness: 0.95, extraversion: 0.4, agreeableness: 0.65, neuroticism: 0.25 },
      emotionalState: { primary: 'analytical', intensity: 0.75, undertones: ['focused', 'skeptical'] },
      expression: { style: 'technical', formality: 0.6, verbosity: 'detailed', catchphrases: ['边界情况', '测试场景'], emojiStyle: 'minimal' },
      memoryImprints: [],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const useConfigStore = create<ConfigState>((set, get) => ({
  providers: defaultProviders,
  agents: [],
  agentGroups: [],
  soulTemplates: defaultSoulTemplates,
  loaded: false,
  
  setProviders: (providers) => {
    set({ providers });
  },
  
  addProvider: (provider) => {
    set((state) => ({
      providers: [...state.providers, provider],
    }));
  },
  
  updateProvider: (id, provider) => {
    set((state) => ({
      providers: state.providers.map((p) =>
        p.id === id ? { ...p, ...provider } : p
      ),
    }));
  },
  
  removeProvider: (id) => {
    set((state) => ({
      providers: state.providers.filter((p) => p.id !== id),
    }));
  },
  
  setAgents: (agents) => {
    set({ agents });
  },
  
  addAgent: (agent) => {
    set((state) => ({
      agents: [...state.agents, agent],
    }));
  },
  
  updateAgent: (id, agent) => {
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, ...agent } : a
      ),
    }));
  },
  
  removeAgent: (id) => {
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== id),
    }));
  },
  
  setAgentGroups: (agentGroups) => {
    set({ agentGroups });
  },
  
  addAgentGroup: (group) => {
    set((state) => ({
      agentGroups: [...state.agentGroups, group],
    }));
  },
  
  updateAgentGroup: (id, group) => {
    set((state) => ({
      agentGroups: state.agentGroups.map((g) =>
        g.id === id ? { ...g, ...group } : g
      ),
    }));
  },
  
  removeAgentGroup: (id) => {
    set((state) => ({
      agentGroups: state.agentGroups.filter((g) => g.id !== id),
    }));
  },
  
  setSoulTemplates: (soulTemplates) => {
    set({ soulTemplates });
  },
  
  addSoulTemplate: (template) => {
    set((state) => ({
      soulTemplates: [...state.soulTemplates, template],
    }));
  },
  
  updateSoulTemplate: (id, template) => {
    set((state) => ({
      soulTemplates: state.soulTemplates.map((t) =>
        t.id === id ? { ...t, ...template, updatedAt: Date.now() } : t
      ),
    }));
  },
  
  removeSoulTemplate: (id) => {
    set((state) => ({
      soulTemplates: state.soulTemplates.filter((t) => t.id !== id),
    }));
  },
  
  loadFromDatabase: async () => {
    try {
      const [providers, agents, groups, templates] = await Promise.all([
        window.zeroclaw.llmProviders.list(),
        window.zeroclaw.desktopAgents.list(),
        window.zeroclaw.agentGroups.list(),
        window.zeroclaw.soulTemplates?.list() || Promise.resolve([]),
      ]);

      console.log('Loaded from database:', { 
        providers: providers.length, 
        agents: agents.length, 
        groups: groups.length,
        templates: templates.length,
      });

      const mergedProviders = providers.length > 0 ? providers : defaultProviders;
      const mergedTemplates = templates.length > 0 ? templates : defaultSoulTemplates;
      
      set({
        providers: mergedProviders,
        agents: agents || [],
        agentGroups: groups || [],
        soulTemplates: mergedTemplates,
        loaded: true,
      });
    } catch (e) {
      console.error('Failed to load config from database:', e);
      set({
        providers: defaultProviders,
        agents: [],
        agentGroups: [],
        soulTemplates: defaultSoulTemplates,
        loaded: true,
      });
    }
  },
  
  saveToDatabase: async () => {
    try {
      const { providers, agents, agentGroups, soulTemplates } = get();
      await Promise.all([
        window.zeroclaw.llmProviders.set(providers),
        window.zeroclaw.desktopAgents.set(agents),
        window.zeroclaw.agentGroups.set(agentGroups),
        // soulTemplates 需要单独保存每个模板
        ...soulTemplates.map(t => 
          window.zeroclaw.soulTemplates?.create(t).catch(() => 
            window.zeroclaw.soulTemplates?.update(t.id, t)
          )
        ),
      ]);
    } catch (e) {
      console.error('Failed to save config to database:', e);
    }
  },
}));
