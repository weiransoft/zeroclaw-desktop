import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

const mockZeroclaw = {
  chat: {
    send: vi.fn().mockResolvedValue({ success: true }),
    abort: vi.fn().mockResolvedValue(undefined),
    history: vi.fn().mockResolvedValue([]),
    sessions: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'test-session-id', name: 'Test Session', createdAt: Date.now() }),
      delete: vi.fn().mockResolvedValue(undefined),
      rename: vi.fn().mockResolvedValue(undefined),
    },
    onMessage: vi.fn().mockReturnValue(() => {}),
    onToolCall: vi.fn().mockReturnValue(() => {}),
    onStatus: vi.fn().mockReturnValue(() => {}),
  },
  swarm: {
    listTasks: vi.fn().mockResolvedValue([]),
    getTask: vi.fn().mockResolvedValue(null),
    getMessages: vi.fn().mockResolvedValue([]),
    getConsensus: vi.fn().mockResolvedValue(null),
    onMessage: vi.fn().mockReturnValue(() => {}),
    onConsensus: vi.fn().mockReturnValue(() => {}),
    onTaskUpdate: vi.fn().mockReturnValue(() => {}),
  },
  workflow: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'test-workflow-id', name: 'Test Workflow', status: 'created' }),
    autoGenerate: vi.fn().mockResolvedValue({ id: 'test-workflow-id', name: 'Generated Workflow' }),
    start: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    status: vi.fn().mockResolvedValue({}),
    templates: {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
    },
    onUpdate: vi.fn().mockReturnValue(() => {}),
  },
  system: {
    getStatus: vi.fn().mockResolvedValue({ running: false, sessionId: null }),
    getConfig: vi.fn().mockResolvedValue({}),
    setConfig: vi.fn().mockResolvedValue(undefined),
    startZeroClaw: vi.fn().mockResolvedValue({ status: 'started' }),
    stopZeroClaw: vi.fn().mockResolvedValue(undefined),
    onLog: vi.fn().mockReturnValue(() => {}),
  },
  onAction: vi.fn().mockReturnValue(() => {}),
};

Object.defineProperty(window, 'zeroclaw', {
  value: mockZeroclaw,
  writable: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  
  mockZeroclaw.chat.onMessage.mockReturnValue(() => {});
  mockZeroclaw.chat.onToolCall.mockReturnValue(() => {});
  mockZeroclaw.chat.onStatus.mockReturnValue(() => {});
  mockZeroclaw.swarm.onMessage.mockReturnValue(() => {});
  mockZeroclaw.swarm.onConsensus.mockReturnValue(() => {});
  mockZeroclaw.swarm.onTaskUpdate.mockReturnValue(() => {});
  mockZeroclaw.workflow.onUpdate.mockReturnValue(() => {});
  mockZeroclaw.system.onLog.mockReturnValue(() => {});
});

export { mockZeroclaw };
