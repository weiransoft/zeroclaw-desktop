import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import { loadZeroClawConfig, ZeroClawConfig, findConfigFile, getConfigSummary } from '../core/config-loader';

interface StoreData {
  // 只有 config 作为系统初始化数据来源
  config: Record<string, any>;
  zeroclawConfigPath: string;
  settings: Record<string, string>;
  llmProviders: any[];
  desktopAgents: any[];
  agentGroups: any[];
  
  // 临时缓存数据（从 Gateway 获取）
  cachedSessions: Record<string, any>;
  cachedMessages: Record<string, any[]>;
  cachedSwarmTasks: Record<string, any>;
  cachedSwarmMessages: any[];
  cachedWorkflows: Record<string, any>;
  cachedWorkflowTemplates: Record<string, any>;
}

export class Database {
  private store: Store<StoreData>;
  private zeroclawConfig: ZeroClawConfig | null = null;
  private zeroclawConfigPath: string | null = null;
  private useGateway: boolean = true;

  constructor() {
    this.store = new Store<StoreData>({
      defaults: {
        // 只保留 config 相关的持久化数据
        config: {},
        zeroclawConfigPath: '',
        settings: {},
        llmProviders: [],
        desktopAgents: [],
        agentGroups: [],
        
        // 缓存数据（不持久化到磁盘）
        cachedSessions: {},
        cachedMessages: {},
        cachedSwarmTasks: {},
        cachedSwarmMessages: [],
        cachedWorkflows: {},
        cachedWorkflowTemplates: {},
      },
    });
    
    this.loadZeroClawConfig();
  }

  getDataDir(): string {
    return this.store.path.replace(/\/[^\/]+$/, '');
  }

  async loadZeroClawConfig(): Promise<void> {
    const customPath = this.store.get('zeroclawConfigPath') || undefined;
    this.zeroclawConfig = await loadZeroClawConfig(customPath);
    this.zeroclawConfigPath = findConfigFile(customPath);
    
    if (this.zeroclawConfig) {
      this.store.set('config', {
        provider: this.zeroclawConfig.default_provider,
        model: this.zeroclawConfig.default_model,
        temperature: this.zeroclawConfig.default_temperature,
        hasApiKey: !!this.zeroclawConfig.api_key,
        workflowEnabled: this.zeroclawConfig.workflow?.enabled,
        agentCount: this.zeroclawConfig.agents ? Object.keys(this.zeroclawConfig.agents).length : 0,
      });

      this.loadAgentsFromConfig();
      this.loadAgentGroupsFromConfig();
    }
  }

  private loadAgentsFromConfig(): void {
    const existingAgents = this.store.get('desktopAgents') || [];
    const userCreatedAgents = existingAgents.filter((a: any) => !a.fromConfig);
    
    if (this.zeroclawConfig?.agents) {
      const configAgents = Object.entries(this.zeroclawConfig.agents).map(([name, cfg]) => ({
        id: `config_${name}`,
        name,
        providerId: (cfg as any).provider || this.zeroclawConfig?.default_provider || 'glm',
        model: (cfg as any).model || this.zeroclawConfig?.default_model || 'glm-4',
        systemPrompt: (cfg as any).system_prompt || '',
        temperature: (cfg as any).temperature || this.zeroclawConfig?.default_temperature || 0.7,
        maxDepth: (cfg as any).max_depth || 3,
        enabled: true,
        fromConfig: true,
      }));

      const mergedAgents = [...userCreatedAgents, ...configAgents];
      this.store.set('desktopAgents', mergedAgents);
      console.log(`Loaded ${configAgents.length} agents from config`);
    }
  }

  private loadAgentGroupsFromConfig(): void {
    const existingGroups = this.store.get('agentGroups') || [];
    const userCreatedGroups = existingGroups.filter((g: any) => !g.fromConfig);
    
    const workflow = this.zeroclawConfig?.workflow as any;
    const teamMembers = workflow?.dev_team_config?.team_members || [];
    const roles = workflow?.workflow?.default_roles || workflow?.default_roles || [];
    
    console.log('Loading agent groups from config:');
    console.log('  - teamMembers:', teamMembers.length);
    console.log('  - roles:', roles);
    
    const agents = this.store.get('desktopAgents') || [];
    const agentIdsByRole: Record<string, string> = {};
    agents.forEach((a: any) => {
      agentIdsByRole[a.name] = a.id;
    });
    console.log('  - agents count:', agents.length);
    
    const configGroups: any[] = [];
    
    if (roles.length > 0) {
      const matchedAgents = roles.map((r: string) => agentIdsByRole[r]).filter(Boolean);
      console.log('  - matchedAgents:', matchedAgents);
      
      const scrumGroup = {
        id: 'config_scrum_team',
        name: 'Scrum 团队',
        description: '从 ZeroClaw 配置文件加载的默认团队',
        agents: matchedAgents,
        autoGenerate: true,
        fromConfig: true,
        teamMembers: teamMembers,
      };
      configGroups.push(scrumGroup);
      console.log('  - Created Scrum group with agents:', scrumGroup.agents);
    }

    const mergedGroups = [...userCreatedGroups, ...configGroups];
    this.store.set('agentGroups', mergedGroups);
    console.log(`Loaded ${configGroups.length} agent groups from config, total: ${mergedGroups.length}`);
  }

  setZeroclawConfigPath(path: string): void {
    this.store.set('zeroclawConfigPath', path);
    this.loadZeroClawConfig();
  }

  getZeroclawConfigPath(): string | null {
    return this.zeroclawConfigPath;
  }

  getZeroclawConfig(): ZeroClawConfig | null {
    return this.zeroclawConfig;
  }

  getZeroclawConfigSummary(): any {
    return getConfigSummary(this.zeroclawConfig);
  }

  getAgents(): any[] {
    if (!this.zeroclawConfig?.agents) return [];
    
    return Object.entries(this.zeroclawConfig.agents).map(([name, cfg]) => ({
      name,
      provider: (cfg as any).provider || this.zeroclawConfig?.default_provider,
      model: (cfg as any).model || this.zeroclawConfig?.default_model,
      temperature: (cfg as any).temperature || this.zeroclawConfig?.default_temperature,
      maxDepth: (cfg as any).max_depth,
    }));
  }

  getWorkflowRoles(): string[] {
    return this.zeroclawConfig?.workflow?.default_roles || [];
  }

  getWorkflowPhases(): string[] {
    return this.zeroclawConfig?.workflow?.default_phases || [];
  }

  getTeamMembers(): any[] {
    return this.zeroclawConfig?.workflow?.dev_team_config?.team_members || [];
  }

  // ============ Settings ============

  getSetting(key: string): string | null {
    const settings = this.store.get('settings');
    if (!settings || typeof settings !== 'object') {
      return null;
    }
    return (settings as Record<string, string>)[key] || null;
  }

  setSetting(key: string, value: string): void {
    let settings = this.store.get('settings');
    if (!settings || typeof settings !== 'object') {
      settings = {};
    }
    (settings as Record<string, string>)[key] = value;
    this.store.set('settings', settings);
  }

  deleteSetting(key: string): void {
    let settings = this.store.get('settings');
    if (settings && typeof settings === 'object') {
      delete (settings as Record<string, string>)[key];
      this.store.set('settings', settings);
    }
  }

  // ============ LLM Providers ============

  getLLMProviders(): any[] {
    return this.store.get('llmProviders') || [];
  }

  setLLMProviders(providers: any[]): void {
    this.store.set('llmProviders', providers);
  }

  addLLMProvider(provider: any): void {
    const providers = this.store.get('llmProviders') || [];
    providers.push(provider);
    this.store.set('llmProviders', providers);
  }

  updateLLMProvider(id: string, data: any): void {
    const providers = this.store.get('llmProviders') || [];
    const index = providers.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      providers[index] = { ...providers[index], ...data };
      this.store.set('llmProviders', providers);
    }
  }

  removeLLMProvider(id: string): void {
    const providers = this.store.get('llmProviders') || [];
    this.store.set('llmProviders', providers.filter((p: any) => p.id !== id));
  }

  // ============ Desktop Agents ============

  getDesktopAgents(): any[] {
    return this.store.get('desktopAgents') || [];
  }

  setDesktopAgents(agents: any[]): void {
    this.store.set('desktopAgents', agents);
  }

  addDesktopAgent(agent: any): void {
    const agents = this.store.get('desktopAgents') || [];
    agents.push(agent);
    this.store.set('desktopAgents', agents);
  }

  updateDesktopAgent(id: string, data: any): void {
    const agents = this.store.get('desktopAgents') || [];
    const index = agents.findIndex((a: any) => a.id === id);
    if (index !== -1) {
      agents[index] = { ...agents[index], ...data };
      this.store.set('desktopAgents', agents);
    }
  }

  removeDesktopAgent(id: string): void {
    const agents = this.store.get('desktopAgents') || [];
    this.store.set('desktopAgents', agents.filter((a: any) => a.id !== id));
  }

  // ============ Agent Groups ============

  getAgentGroups(): any[] {
    return this.store.get('agentGroups') || [];
  }

  setAgentGroups(groups: any[]): void {
    this.store.set('agentGroups', groups);
  }

  addAgentGroup(group: any): void {
    const groups = this.store.get('agentGroups') || [];
    groups.push(group);
    this.store.set('agentGroups', groups);
  }

  updateAgentGroup(id: string, data: any): void {
    const groups = this.store.get('agentGroups') || [];
    const index = groups.findIndex((g: any) => g.id === id);
    if (index !== -1) {
      groups[index] = { ...groups[index], ...data };
      this.store.set('agentGroups', groups);
    }
  }

  removeAgentGroup(id: string): void {
    const groups = this.store.get('agentGroups') || [];
    this.store.set('agentGroups', groups.filter((g: any) => g.id !== id));
  }

  // ============ Sessions (从 Gateway 获取) ============

  // 设置缓存方法 - 供 bridge 调用
  setCachedSessions(sessions: any[]): void {
    const cachedSessions: Record<string, any> = {};
    for (const s of sessions) {
      cachedSessions[s.id] = s;
    }
    this.store.set('cachedSessions', cachedSessions);
  }

  getCachedSessions(): Record<string, any> {
    return this.store.get('cachedSessions');
  }

  createSession(name?: string, id?: string): { id: string; name: string; createdAt: number } {
    const sessionId = id || uuidv4();
    const now = Date.now();
    const sessionName = name || `Chat ${new Date().toLocaleDateString()}`;
    
    const session = {
      id: sessionId,
      name: sessionName,
      createdAt: now,
      updatedAt: now,
    };
    
    const sessions = this.store.get('cachedSessions');
    sessions[sessionId] = session;
    this.store.set('cachedSessions', sessions);
    
    const messages = this.store.get('cachedMessages');
    messages[sessionId] = [];
    this.store.set('cachedMessages', messages);
    
    return { id: sessionId, name: sessionName, createdAt: now };
  }

  listSessions(): any[] {
    const sessions = this.store.get('cachedSessions');
    const messages = this.store.get('cachedMessages');
    
    return Object.values(sessions).map((s: any) => ({
      ...s,
      messageCount: messages[s.id]?.length || 0,
    })).sort((a, b) => (b as any).updatedAt - (a as any).updatedAt);
  }

  deleteSession(sessionId: string): void {
    const sessions = this.store.get('cachedSessions');
    delete sessions[sessionId];
    this.store.set('cachedSessions', sessions);

    const messages = this.store.get('cachedMessages');
    delete messages[sessionId];
    this.store.set('cachedMessages', messages);
  }

  renameSession(sessionId: string, name: string): void {
    const sessions = this.store.get('cachedSessions');
    if (sessions[sessionId]) {
      sessions[sessionId].name = name;
      sessions[sessionId].updatedAt = Date.now();
      this.store.set('cachedSessions', sessions);
    }
  }

  // ============ Messages (从 Gateway 获取) ============

  // 设置缓存消息 - 供 bridge 调用
  setCachedMessages(sessionId: string, messages: any[]): void {
    const cachedMessages = this.store.get('cachedMessages');
    cachedMessages[sessionId] = messages;
    this.store.set('cachedMessages', cachedMessages);
  }

  addMessage(sessionId: string, message: any): void {
    const messages = this.store.get('cachedMessages');
    if (!messages[sessionId]) {
      messages[sessionId] = [];
    }
    messages[sessionId].push({
      ...message,
      id: message.id || uuidv4(),
      timestamp: message.timestamp || Date.now(),
    });
    
    if (messages[sessionId].length > 1000) {
      messages[sessionId] = messages[sessionId].slice(-500);
    }
    
    this.store.set('cachedMessages', messages);

    const sessions = this.store.get('cachedSessions');
    if (sessions[sessionId]) {
      sessions[sessionId].updatedAt = Date.now();
      this.store.set('cachedSessions', sessions);
    }
  }

  getChatHistory(sessionId: string, limit: number): any[] {
    const messages = this.store.get('cachedMessages');
    return (messages[sessionId] || []).slice(-limit);
  }

  // ============ Swarm (从 Gateway 获取) ============

  // 设置缓存 - 供 bridge 调用
  setCachedSwarmTasks(tasks: any[]): void {
    const cachedSwarmTasks: Record<string, any> = {};
    for (const t of tasks) {
      cachedSwarmTasks[t.id] = t;
    }
    this.store.set('cachedSwarmTasks', cachedSwarmTasks);
  }

  setCachedSwarmMessages(messages: any[]): void {
    this.store.set('cachedSwarmMessages', messages);
  }

  addSwarmMessage(message: any): void {
    const swarmMessages = this.store.get('cachedSwarmMessages');
    swarmMessages.push({
      ...message,
      id: message.id || uuidv4(),
      timestamp: message.timestamp || Date.now(),
    });
    if (swarmMessages.length > 1000) {
      swarmMessages.shift();
    }
    this.store.set('cachedSwarmMessages', swarmMessages);
  }

  listSwarmTasks(): any[] {
    const tasks = this.store.get('cachedSwarmTasks');
    return Object.values(tasks).sort((a: any, b: any) => b.createdAt - a.createdAt);
  }

  getSwarmTask(taskId: string): any {
    const tasks = this.store.get('cachedSwarmTasks');
    return tasks[taskId];
  }

  addSwarmTask(task: any): void {
    const tasks = this.store.get('cachedSwarmTasks');
    tasks[task.id] = {
      ...task,
      createdAt: task.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    this.store.set('cachedSwarmTasks', tasks);
  }

  updateSwarmTask(taskId: string, updates: any): void {
    const tasks = this.store.get('cachedSwarmTasks');
    if (tasks[taskId]) {
      tasks[taskId] = {
        ...tasks[taskId],
        ...updates,
        updatedAt: Date.now(),
      };
      this.store.set('cachedSwarmTasks', tasks);
    }
  }

  upsertSwarmTask(task: any): void {
    const tasks = this.store.get('cachedSwarmTasks');
    const existing = tasks[task.id];
    if (existing) {
      tasks[task.id] = {
        ...existing,
        ...task,
        updatedAt: Date.now(),
      };
    } else {
      tasks[task.id] = {
        ...task,
        createdAt: task.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
    }
    this.store.set('cachedSwarmTasks', tasks);
  }

  getSwarmMessages(runId?: string, taskId?: string, limit?: number): any[] {
    let messages = this.store.get('cachedSwarmMessages');
    
    if (runId) {
      messages = messages.filter((m: any) => m.runId === runId);
    }
    if (taskId) {
      messages = messages.filter((m: any) => m.taskId === taskId);
    }
    
    return messages.slice(-(limit || 100));
  }

  getConsensusState(taskId: string): any {
    const messages = this.store.get('cachedSwarmMessages');
    const taskMessages = messages.filter(
      (m: any) => m.taskId === taskId && 
        ['consensus_request', 'consensus_response', 'disagreement'].includes(m.messageType)
    );

    if (taskMessages.length === 0) return null;

    const agreements: string[] = [];
    const disagreements: string[] = [];

    for (const msg of taskMessages) {
      if (msg.messageType === 'consensus_response') {
        if (msg.metadata?.agrees) {
          agreements.push(msg.author);
        } else {
          disagreements.push(msg.author);
        }
      }
    }

    return {
      taskId,
      agreements,
      disagreements,
      messages: taskMessages,
    };
  }

  // ============ Workflows (从 Gateway 获取) ============

  // 设置缓存 - 供 bridge 调用
  setCachedWorkflows(workflows: any[]): void {
    const cachedWorkflows: Record<string, any> = {};
    for (const w of workflows) {
      cachedWorkflows[w.id] = w;
    }
    this.store.set('cachedWorkflows', cachedWorkflows);
  }

  createWorkflow(config: any): any {
    const id = uuidv4();
    const now = Date.now();

    const workflow = {
      id,
      name: config.name,
      description: config.description || '',
      status: 'created',
      roles: config.roles || [],
      steps: config.steps || [],
      createdAt: now,
      updatedAt: now,
    };

    const workflows = this.store.get('cachedWorkflows');
    workflows[id] = workflow;
    this.store.set('cachedWorkflows', workflows);

    return workflow;
  }

  listWorkflows(): any[] {
    const workflows = this.store.get('cachedWorkflows');
    return Object.values(workflows).sort((a: any, b: any) => b.updatedAt - a.updatedAt);
  }

  getWorkflow(id: string): any {
    const workflows = this.store.get('cachedWorkflows');
    return workflows[id];
  }

  updateWorkflow(workflow: any): void {
    const workflows = this.store.get('cachedWorkflows');
    workflows[workflow.id] = {
      ...workflow,
      updatedAt: Date.now(),
    };
    this.store.set('cachedWorkflows', workflows);
  }

  getWorkflowStatus(id: string): any {
    const workflow = this.getWorkflow(id);
    if (!workflow) return null;

    const totalSteps = workflow.steps?.length || 0;
    const completedSteps = workflow.steps?.filter((s: any) => s.status === 'completed').length || 0;

    return {
      id: workflow.id,
      name: workflow.name,
      status: workflow.status,
      progress: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
      currentStep: workflow.steps?.find((s: any) => s.status === 'running'),
    };
  }

  // ============ Templates (从 Gateway 获取) ============

  // 设置缓存 - 供 bridge 调用
  setCachedWorkflowTemplates(templates: any[]): void {
    const cachedWorkflowTemplates: Record<string, any> = {};
    for (const t of templates) {
      cachedWorkflowTemplates[t.id] = t;
    }
    this.store.set('cachedWorkflowTemplates', cachedWorkflowTemplates);
  }

  listWorkflowTemplates(): any[] {
    const templates = this.store.get('cachedWorkflowTemplates');
    return Object.values(templates);
  }

  getWorkflowTemplate(id: string): any {
    const templates = this.store.get('cachedWorkflowTemplates');
    return templates[id];
  }

  // ============ Config ============

  getConfig(): any {
    return this.store.get('config');
  }

  setConfig(config: any): void {
    const currentConfig = this.store.get('config');
    this.store.set('config', { ...currentConfig, ...config });
  }

  // ============ Cleanup ============

  close(): void {
    // electron-store auto-saves
  }
}
