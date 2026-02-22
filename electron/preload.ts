import { contextBridge, ipcRenderer } from 'electron';

const api = {
  platform: process.platform,
  
  chat: {
    send: (message: string, sessionId?: string) => 
      ipcRenderer.invoke('chat:send', message, sessionId),
    abort: (sessionId: string) => 
      ipcRenderer.invoke('chat:abort', sessionId),
    history: (sessionId: string, limit?: number) => 
      ipcRenderer.invoke('chat:history', sessionId, limit),
    sessions: {
      list: () => ipcRenderer.invoke('chat:sessions:list'),
      create: (name?: string) => ipcRenderer.invoke('chat:sessions:create', name),
      delete: (sessionId: string) => ipcRenderer.invoke('chat:sessions:delete', sessionId),
      rename: (sessionId: string, name: string) => 
        ipcRenderer.invoke('chat:sessions:rename', sessionId, name),
    },
    onMessage: (callback: (msg: any) => void) => {
      const handler = (_: any, msg: any) => callback(msg);
      ipcRenderer.on('chat:message', handler);
      return () => ipcRenderer.removeListener('chat:message', handler);
    },
    onToolCall: (callback: (call: any) => void) => {
      const handler = (_: any, call: any) => callback(call);
      ipcRenderer.on('chat:toolcall', handler);
      return () => ipcRenderer.removeListener('chat:toolcall', handler);
    },
    onStatus: (callback: (status: any) => void) => {
      const handler = (_: any, status: any) => callback(status);
      ipcRenderer.on('chat:status', handler);
      return () => ipcRenderer.removeListener('chat:status', handler);
    },
    onStreamStart: (callback: (data: any) => void) => {
      const handler = (_: any, data: any) => callback(data);
      ipcRenderer.on('chat:stream-start', handler);
      return () => ipcRenderer.removeListener('chat:stream-start', handler);
    },
    onStreamChunk: (callback: (data: any) => void) => {
      const handler = (_: any, data: any) => callback(data);
      ipcRenderer.on('chat:stream-chunk', handler);
      return () => ipcRenderer.removeListener('chat:stream-chunk', handler);
    },
    onStreamEnd: (callback: (data: any) => void) => {
      const handler = (_: any, data: any) => callback(data);
      ipcRenderer.on('chat:stream-end', handler);
      return () => ipcRenderer.removeListener('chat:stream-end', handler);
    },
  },

  swarm: {
    listTasks: () => ipcRenderer.invoke('swarm:list'),
    getTask: (taskId: string) => ipcRenderer.invoke('swarm:get', taskId),
    getMessages: (runId?: string, taskId?: string, limit?: number) => 
      ipcRenderer.invoke('swarm:messages', runId, taskId, limit),
    getConsensus: (taskId: string) => 
      ipcRenderer.invoke('swarm:consensus', taskId),
    onMessage: (callback: (msg: any) => void) => {
      const handler = (_: any, msg: any) => callback(msg);
      ipcRenderer.on('swarm:message', handler);
      return () => ipcRenderer.removeListener('swarm:message', handler);
    },
    onConsensus: (callback: (state: any) => void) => {
      const handler = (_: any, state: any) => callback(state);
      ipcRenderer.on('swarm:consensus', handler);
      return () => ipcRenderer.removeListener('swarm:consensus', handler);
    },
    onTaskUpdate: (callback: (task: any) => void) => {
      const handler = (_: any, task: any) => callback(task);
      ipcRenderer.on('swarm:task', handler);
      return () => ipcRenderer.removeListener('swarm:task', handler);
    },
  },

  workflow: {
    list: () => ipcRenderer.invoke('workflow:list'),
    get: (id: string) => ipcRenderer.invoke('workflow:get', id),
    create: (config: any) => ipcRenderer.invoke('workflow:create', config),
    autoGenerate: (prompt: string) => ipcRenderer.invoke('workflow:auto-generate', prompt),
    start: (id: string) => ipcRenderer.invoke('workflow:start', id),
    pause: (id: string) => ipcRenderer.invoke('workflow:pause', id),
    resume: (id: string) => ipcRenderer.invoke('workflow:resume', id),
    stop: (id: string) => ipcRenderer.invoke('workflow:stop', id),
    status: (id: string) => ipcRenderer.invoke('workflow:status', id),
    templates: {
      list: () => ipcRenderer.invoke('workflow:templates:list'),
      get: (id: string) => ipcRenderer.invoke('workflow:templates:get', id),
    },
    getRoles: () => ipcRenderer.invoke('workflow:roles'),
    getPhases: (workflowId: string) => ipcRenderer.invoke('workflow:phases:get', workflowId),
    getTeamMembers: () => ipcRenderer.invoke('workflow:team-members'),
    getContext: (workflowId: string) => ipcRenderer.invoke('workflow:context', workflowId),
    listApprovals: (workflowId?: string) => ipcRenderer.invoke('workflow:approvals:list', workflowId),
    respondToApproval: (approvalId: string, approved: boolean, comment?: string) => 
      ipcRenderer.invoke('workflow:approval:respond', approvalId, approved, comment),
    onUpdate: (callback: (wf: any) => void) => {
      const handler = (_: any, wf: any) => callback(wf);
      ipcRenderer.on('workflow:update', handler);
      return () => ipcRenderer.removeListener('workflow:update', handler);
    },
  },

  system: {
    getStatus: () => ipcRenderer.invoke('system:status'),
    getConfig: () => ipcRenderer.invoke('system:config'),
    setConfig: (config: any) => ipcRenderer.invoke('system:setConfig', config),
    startZeroClaw: () => ipcRenderer.invoke('system:start'),
    stopZeroClaw: () => ipcRenderer.invoke('system:stop'),
    pair: (pairingCode: string) => ipcRenderer.invoke('system:pair', pairingCode),
    getPairingStatus: () => ipcRenderer.invoke('system:pairing-status'),
    setToken: (token: string): Promise<{ success: boolean; message: string }> => 
      ipcRenderer.invoke('system:set-token', token),
    onLog: (callback: (log: any) => void) => {
      const handler = (_: any, log: any) => callback(log);
      ipcRenderer.on('system:log', handler);
      return () => ipcRenderer.removeListener('system:log', handler);
    },
  },

  zeroclaw: {
    getConfig: () => ipcRenderer.invoke('zeroclaw:config'),
    getConfigPath: () => ipcRenderer.invoke('zeroclaw:config-path'),
    getConfigSummary: () => ipcRenderer.invoke('zeroclaw:config-summary'),
    getAgents: () => ipcRenderer.invoke('zeroclaw:agents'),
    setConfigPath: (path: string) => ipcRenderer.invoke('zeroclaw:set-config-path', path),
    selectConfigFile: () => ipcRenderer.invoke('zeroclaw:select-config'),
  },

  llmProviders: {
    list: () => ipcRenderer.invoke('llm-providers:list'),
    set: (providers: any[]) => ipcRenderer.invoke('llm-providers:set', providers),
    add: (provider: any) => ipcRenderer.invoke('llm-providers:add', provider),
    update: (id: string, data: any) => ipcRenderer.invoke('llm-providers:update', id, data),
    remove: (id: string) => ipcRenderer.invoke('llm-providers:remove', id),
  },

  desktopAgents: {
    list: () => ipcRenderer.invoke('desktop-agents:list'),
    set: (agents: any[]) => ipcRenderer.invoke('desktop-agents:set', agents),
    add: (agent: any) => ipcRenderer.invoke('desktop-agents:add', agent),
    update: (id: string, data: any) => ipcRenderer.invoke('desktop-agents:update', id, data),
    remove: (id: string) => ipcRenderer.invoke('desktop-agents:remove', id),
  },

  agentGroups: {
    list: () => ipcRenderer.invoke('agent-groups:list'),
    set: (groups: any[]) => ipcRenderer.invoke('agent-groups:set', groups),
    add: (group: any) => ipcRenderer.invoke('agent-groups:add', group),
    update: (id: string, data: any) => ipcRenderer.invoke('agent-groups:update', id, data),
    remove: (id: string) => ipcRenderer.invoke('agent-groups:remove', id),
  },

  prompt: {
    optimize: (prompt: string, agentName?: string, requirements?: string) => 
      ipcRenderer.invoke('prompt:optimize', prompt, agentName, requirements),
    analyzeTask: (message: string, tools?: string[]) => 
      ipcRenderer.invoke('prompt:analyze-task', message, tools),
    getConfig: () => ipcRenderer.invoke('prompt:config'),
    setConfig: (config: any) => ipcRenderer.invoke('prompt:set-config', config),
  },

  soul: {
    getStrategy: () => ipcRenderer.invoke('soul:strategy'),
    setStrategy: (strategy: any) => ipcRenderer.invoke('soul:set-strategy', strategy),
  },

  soulTemplates: {
    list: () => ipcRenderer.invoke('soul-templates:list'),
    get: (id: string) => ipcRenderer.invoke('soul-templates:get', id),
    set: (templates: any[]) => ipcRenderer.invoke('soul-templates:set', templates),
    generatePrompt: (soulId: string) => ipcRenderer.invoke('soul-templates:generate-prompt', soulId),
  },

  cost: {
    summary: () => ipcRenderer.invoke('cost:summary'),
  },

  mcp: {
    list: () => ipcRenderer.invoke('mcp:list'),
    create: (request: any) => ipcRenderer.invoke('mcp:create', request),
    get: (id: string) => ipcRenderer.invoke('mcp:get', id),
    update: (id: string, request: any) => ipcRenderer.invoke('mcp:update', id, request),
    delete: (id: string) => ipcRenderer.invoke('mcp:delete', id),
    start: (id: string) => ipcRenderer.invoke('mcp:start', id),
    stop: (id: string) => ipcRenderer.invoke('mcp:stop', id),
    tools: (id: string) => ipcRenderer.invoke('mcp:tools', id),
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (callback: (maximized: boolean) => void) => {
      const handler = (_: any, maximized: boolean) => callback(maximized);
      ipcRenderer.on('window:maximize-change', handler);
      return () => ipcRenderer.removeListener('window:maximize-change', handler);
    },
  },

  onAction: (callback: (action: string, data?: any) => void) => {
    const handler = (_: any, action: string, data?: any) => callback(action, data);
    ipcRenderer.on('action', handler);
    return () => ipcRenderer.removeListener('action', handler);
  },
};

contextBridge.exposeInMainWorld('zeroclaw', api);

// Note: We intentionally do NOT expose a generic electron API
// to prevent arbitrary IPC channel access from the renderer.
// All IPC communication should go through the zeroclaw API above.

export type ZeroClawAPI = typeof api;
