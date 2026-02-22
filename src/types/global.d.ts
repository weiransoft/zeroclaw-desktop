import { Message, Session, SwarmMessage, SwarmTask, ConsensusState, Workflow, WorkflowTemplate, SystemStatus } from './index';

export interface ZeroClawAPI {
  platform: string;
  
  chat: {
    send: (message: string, sessionId?: string) => Promise<{ success: boolean }>;
    abort: (sessionId: string) => Promise<void>;
    history: (sessionId: string, limit?: number) => Promise<Message[]>;
    sessions: {
      list: () => Promise<Session[]>;
      create: (name?: string) => Promise<Session>;
      delete: (id: string) => Promise<void>;
      rename: (id: string, name: string) => Promise<void>;
    };
    onMessage: (callback: (msg: Message) => void) => () => void;
    onToolCall: (callback: (call: any) => void) => () => void;
    onStatus: (callback: (status: any) => void) => () => void;
    onStreamStart?: (callback: (data: any) => void) => () => void;
    onStreamChunk?: (callback: (data: any) => void) => () => void;
    onStreamEnd?: (callback: (data: any) => void) => () => void;
  };

  swarm: {
    listTasks: () => Promise<SwarmTask[]>;
    getTask: (taskId: string) => Promise<SwarmTask>;
    getMessages: (runId?: string, taskId?: string, limit?: number) => Promise<SwarmMessage[]>;
    getConsensus: (taskId: string) => Promise<ConsensusState>;
    onMessage: (callback: (msg: SwarmMessage) => void) => () => void;
    onConsensus: (callback: (state: ConsensusState) => void) => () => void;
    onTaskUpdate: (callback: (task: SwarmTask) => void) => () => void;
  };

  workflow: {
    list: () => Promise<Workflow[]>;
    get: (id: string) => Promise<Workflow>;
    create: (config: any) => Promise<Workflow>;
    start: (id: string) => Promise<void>;
    pause: (id: string) => Promise<void>;
    resume: (id: string) => Promise<void>;
    stop: (id: string) => Promise<void>;
    getTemplates: () => Promise<WorkflowTemplate[]>;
    getTemplate: (id: string) => Promise<WorkflowTemplate>;
    getRoles: () => Promise<string[]>;
    getTeamMembers: () => Promise<any[]>;
    autoGenerate: (prompt: string) => Promise<any>;
  };

  zeroclaw: {
    getConfig: () => Promise<any>;
    getConfigPath: () => Promise<string | null>;
    getConfigSummary: () => Promise<any>;
    getAgents: () => Promise<any[]>;
    setConfigPath: (path: string) => Promise<void>;
    selectConfigFile: () => Promise<{ success: boolean; path: string | null }>;
  };

  llmProviders: {
    list: () => Promise<any[]>;
    set: (providers: any[]) => Promise<void>;
    add: (provider: any) => Promise<void>;
    update: (id: string, data: any) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };

  desktopAgents: {
    list: () => Promise<any[]>;
    set: (agents: any[]) => Promise<void>;
    add: (agent: any) => Promise<void>;
    update: (id: string, data: any) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };

  agentGroups: {
    list: () => Promise<any[]>;
    set: (groups: any[]) => Promise<void>;
    add: (group: any) => Promise<void>;
    update: (id: string, data: any) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };

  prompt: {
    optimize: (prompt: string, agentName?: string, requirements?: string) => Promise<{
      success: boolean;
      optimizedPrompt?: string;
      error?: string;
    }>;
  };

  system: {
    getStatus: () => Promise<SystemStatus>;
    getConfig: () => Promise<any>;
    setConfig: (config: any) => Promise<void>;
    startZeroClaw: () => Promise<any>;
    stopZeroClaw: () => Promise<void>;
    onLog: (callback: (log: any) => void) => () => void;
    getPairingStatus: () => Promise<{ gatewayAvailable: boolean; isPaired: boolean }>;
    pair: (code: string) => Promise<{ success: boolean; error?: string }>;
    setToken: (token: string) => Promise<{ success: boolean; message: string }>;
  };

  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    onMaximizeChange?: (callback: (maximized: boolean) => void) => () => void;
  };
}

declare global {
  interface Window {
    zeroclaw: ZeroClawAPI;
  }
}

export {};
