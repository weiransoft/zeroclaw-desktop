import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockZeroclaw } from '../setup';

describe('IPC通信集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Chat API', () => {
    describe('会话管理', () => {
      it('应该正确创建会话', async () => {
        const newSession = {
          id: 'session-123',
          name: 'New Chat',
          createdAt: Date.now(),
        };

        mockZeroclaw.chat.sessions.create.mockResolvedValueOnce(newSession);

        const result = await window.zeroclaw.chat.sessions.create('New Chat');

        expect(result).toEqual(newSession);
        expect(mockZeroclaw.chat.sessions.create).toHaveBeenCalledWith('New Chat');
      });

      it('应该正确获取会话列表', async () => {
        const sessions = [
          { id: 's1', name: 'Session 1', messageCount: 5, createdAt: 1000, updatedAt: 2000 },
          { id: 's2', name: 'Session 2', messageCount: 3, createdAt: 3000, updatedAt: 4000 },
        ];

        mockZeroclaw.chat.sessions.list.mockResolvedValueOnce(sessions);

        const result = await window.zeroclaw.chat.sessions.list();

        expect(result).toEqual(sessions);
      });

      it('应该正确删除会话', async () => {
        mockZeroclaw.chat.sessions.delete.mockResolvedValueOnce(undefined);

        await window.zeroclaw.chat.sessions.delete('session-123');

        expect(mockZeroclaw.chat.sessions.delete).toHaveBeenCalledWith('session-123');
      });

      it('应该正确重命名会话', async () => {
        mockZeroclaw.chat.sessions.rename.mockResolvedValueOnce(undefined);

        await window.zeroclaw.chat.sessions.rename('session-123', 'New Name');

        expect(mockZeroclaw.chat.sessions.rename).toHaveBeenCalledWith('session-123', 'New Name');
      });
    });

    describe('消息处理', () => {
      it('应该正确发送消息', async () => {
        mockZeroclaw.chat.send.mockResolvedValueOnce({ success: true });

        const result = await window.zeroclaw.chat.send('Hello, world!', 'session-123');

        expect(result.success).toBe(true);
        expect(mockZeroclaw.chat.send).toHaveBeenCalledWith('Hello, world!', 'session-123');
      });

      it('应该正确中止消息', async () => {
        mockZeroclaw.chat.abort.mockResolvedValueOnce(undefined);

        await window.zeroclaw.chat.abort('session-123');

        expect(mockZeroclaw.chat.abort).toHaveBeenCalledWith('session-123');
      });

      it('应该正确获取历史消息', async () => {
        const history = [
          { id: 'm1', role: 'user', content: 'Hello', timestamp: 1000 },
          { id: 'm2', role: 'assistant', content: 'Hi there!', timestamp: 2000 },
        ];

        mockZeroclaw.chat.history.mockResolvedValueOnce(history);

        const result = await window.zeroclaw.chat.history('session-123', 100);

        expect(result).toEqual(history);
        expect(mockZeroclaw.chat.history).toHaveBeenCalledWith('session-123', 100);
      });
    });

    describe('事件订阅', () => {
      it('应该正确订阅消息事件', () => {
        const callback = vi.fn();
        const unsubscribe = window.zeroclaw.chat.onMessage(callback);

        expect(mockZeroclaw.chat.onMessage).toHaveBeenCalledWith(callback);
        expect(typeof unsubscribe).toBe('function');
      });

      it('应该正确订阅工具调用事件', () => {
        const callback = vi.fn();
        const unsubscribe = window.zeroclaw.chat.onToolCall(callback);

        expect(mockZeroclaw.chat.onToolCall).toHaveBeenCalledWith(callback);
        expect(typeof unsubscribe).toBe('function');
      });

      it('应该正确订阅状态事件', () => {
        const callback = vi.fn();
        const unsubscribe = window.zeroclaw.chat.onStatus(callback);

        expect(mockZeroclaw.chat.onStatus).toHaveBeenCalledWith(callback);
        expect(typeof unsubscribe).toBe('function');
      });
    });
  });

  describe('Swarm API', () => {
    describe('任务管理', () => {
      it('应该正确获取任务列表', async () => {
        const tasks = [
          {
            id: 't1',
            runId: 'r1',
            agentName: 'Agent1',
            task: 'Task 1',
            status: 'running',
            depth: 0,
            createdAt: 1000,
            updatedAt: 2000,
          },
        ];

        mockZeroclaw.swarm.listTasks.mockResolvedValueOnce(tasks);

        const result = await window.zeroclaw.swarm.listTasks();

        expect(result).toEqual(tasks);
      });

      it('应该正确获取单个任务', async () => {
        const task = {
          id: 't1',
          runId: 'r1',
          agentName: 'Agent1',
          task: 'Task 1',
          status: 'running',
          depth: 0,
          createdAt: 1000,
          updatedAt: 2000,
        };

        mockZeroclaw.swarm.getTask.mockResolvedValueOnce(task);

        const result = await window.zeroclaw.swarm.getTask('t1');

        expect(result).toEqual(task);
        expect(mockZeroclaw.swarm.getTask).toHaveBeenCalledWith('t1');
      });
    });

    describe('消息获取', () => {
      it('应该正确获取群聊消息', async () => {
        const messages = [
          {
            id: 'm1',
            runId: 'r1',
            taskId: 't1',
            author: 'Agent1',
            authorType: 'agent',
            messageType: 'task_assignment',
            content: 'Task assigned',
            timestamp: 1000,
          },
        ];

        mockZeroclaw.swarm.getMessages.mockResolvedValueOnce(messages);

        const result = await window.zeroclaw.swarm.getMessages('r1', 't1', 50);

        expect(result).toEqual(messages);
        expect(mockZeroclaw.swarm.getMessages).toHaveBeenCalledWith('r1', 't1', 50);
      });

      it('应该正确获取共识状态', async () => {
        const consensus = {
          taskId: 't1',
          status: 'pending',
          participants: ['Agent1', 'Agent2'],
          agreements: ['Agent1'],
          disagreements: ['Agent2'],
        };

        mockZeroclaw.swarm.getConsensus.mockResolvedValueOnce(consensus);

        const result = await window.zeroclaw.swarm.getConsensus('t1');

        expect(result).toEqual(consensus);
      });
    });

    describe('事件订阅', () => {
      it('应该正确订阅群聊消息事件', () => {
        const callback = vi.fn();
        const unsubscribe = window.zeroclaw.swarm.onMessage(callback);

        expect(mockZeroclaw.swarm.onMessage).toHaveBeenCalledWith(callback);
        expect(typeof unsubscribe).toBe('function');
      });

      it('应该正确订阅共识事件', () => {
        const callback = vi.fn();
        const unsubscribe = window.zeroclaw.swarm.onConsensus(callback);

        expect(mockZeroclaw.swarm.onConsensus).toHaveBeenCalledWith(callback);
        expect(typeof unsubscribe).toBe('function');
      });

      it('应该正确订阅任务更新事件', () => {
        const callback = vi.fn();
        const unsubscribe = window.zeroclaw.swarm.onTaskUpdate(callback);

        expect(mockZeroclaw.swarm.onTaskUpdate).toHaveBeenCalledWith(callback);
        expect(typeof unsubscribe).toBe('function');
      });
    });
  });

  describe('Workflow API', () => {
    describe('工作流管理', () => {
      it('应该正确创建工作流', async () => {
        const config = {
          name: 'Test Workflow',
          description: 'Test description',
          roles: ['agent1'],
          steps: [],
        };

        const workflow = {
          id: 'w1',
          ...config,
          status: 'created',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        mockZeroclaw.workflow.create.mockResolvedValueOnce(workflow);

        const result = await window.zeroclaw.workflow.create(config);

        expect(result).toEqual(workflow);
        expect(mockZeroclaw.workflow.create).toHaveBeenCalledWith(config);
      });

      it('应该正确自动生成工作流', async () => {
        const workflow = {
          id: 'w1',
          name: 'Generated Workflow',
          status: 'created',
        };

        mockZeroclaw.workflow.autoGenerate.mockResolvedValueOnce(workflow);

        const result = await window.zeroclaw.workflow.autoGenerate('Create a scrum workflow');

        expect(result).toEqual(workflow);
      });

      it('应该正确获取工作流列表', async () => {
        const workflows = [
          {
            id: 'w1',
            name: 'Workflow 1',
            status: 'created',
          },
        ];

        mockZeroclaw.workflow.list.mockResolvedValueOnce(workflows);

        const result = await window.zeroclaw.workflow.list();

        expect(result).toEqual(workflows);
      });

      it('应该正确获取单个工作流', async () => {
        const workflow = {
          id: 'w1',
          name: 'Workflow 1',
          status: 'created',
        };

        mockZeroclaw.workflow.get.mockResolvedValueOnce(workflow);

        const result = await window.zeroclaw.workflow.get('w1');

        expect(result).toEqual(workflow);
      });
    });

    describe('工作流控制', () => {
      it('应该正确启动工作流', async () => {
        mockZeroclaw.workflow.start.mockResolvedValueOnce(undefined);

        await window.zeroclaw.workflow.start('w1');

        expect(mockZeroclaw.workflow.start).toHaveBeenCalledWith('w1');
      });

      it('应该正确暂停工作流', async () => {
        mockZeroclaw.workflow.pause.mockResolvedValueOnce(undefined);

        await window.zeroclaw.workflow.pause('w1');

        expect(mockZeroclaw.workflow.pause).toHaveBeenCalledWith('w1');
      });

      it('应该正确恢复工作流', async () => {
        mockZeroclaw.workflow.resume.mockResolvedValueOnce(undefined);

        await window.zeroclaw.workflow.resume('w1');

        expect(mockZeroclaw.workflow.resume).toHaveBeenCalledWith('w1');
      });

      it('应该正确停止工作流', async () => {
        mockZeroclaw.workflow.stop.mockResolvedValueOnce(undefined);

        await window.zeroclaw.workflow.stop('w1');

        expect(mockZeroclaw.workflow.stop).toHaveBeenCalledWith('w1');
      });
    });

    describe('模板管理', () => {
      it('应该正确获取模板列表', async () => {
        const templates = [
          {
            id: 't1',
            name: 'Template 1',
            description: 'Test template',
            author: 'Author1',
            createdAt: 1000,
          },
        ];

        mockZeroclaw.workflow.templates.list.mockResolvedValueOnce(templates);

        const result = await window.zeroclaw.workflow.templates.list();

        expect(result).toEqual(templates);
      });

      it('应该正确获取单个模板', async () => {
        const template = {
          id: 't1',
          name: 'Template 1',
          template: {},
        };

        mockZeroclaw.workflow.templates.get.mockResolvedValueOnce(template);

        const result = await window.zeroclaw.workflow.templates.get('t1');

        expect(result).toEqual(template);
      });
    });

    describe('事件订阅', () => {
      it('应该正确订阅工作流更新事件', () => {
        const callback = vi.fn();
        const unsubscribe = window.zeroclaw.workflow.onUpdate(callback);

        expect(mockZeroclaw.workflow.onUpdate).toHaveBeenCalledWith(callback);
        expect(typeof unsubscribe).toBe('function');
      });
    });
  });

  describe('System API', () => {
    describe('系统状态', () => {
      it('应该正确获取系统状态', async () => {
        const status = {
          running: true,
          sessionId: 'session-123',
          model: 'gpt-4',
          provider: 'openai',
        };

        mockZeroclaw.system.getStatus.mockResolvedValueOnce(status);

        const result = await window.zeroclaw.system.getStatus();

        expect(result).toEqual(status);
      });

      it('应该正确启动ZeroClaw', async () => {
        mockZeroclaw.system.startZeroClaw.mockResolvedValueOnce({ status: 'started' });

        const result = await window.zeroclaw.system.startZeroClaw();

        expect(result.status).toBe('started');
      });

      it('应该正确停止ZeroClaw', async () => {
        mockZeroclaw.system.stopZeroClaw.mockResolvedValueOnce(undefined);

        await window.zeroclaw.system.stopZeroClaw();

        expect(mockZeroclaw.system.stopZeroClaw).toHaveBeenCalled();
      });
    });

    describe('配置管理', () => {
      it('应该正确获取配置', async () => {
        const config = {
          theme: 'dark',
          language: 'zh',
          provider: 'openrouter',
        };

        mockZeroclaw.system.getConfig.mockResolvedValueOnce(config);

        const result = await window.zeroclaw.system.getConfig();

        expect(result).toEqual(config);
      });

      it('应该正确设置配置', async () => {
        const newConfig = {
          theme: 'light',
          language: 'en',
        };

        mockZeroclaw.system.setConfig.mockResolvedValueOnce(undefined);

        await window.zeroclaw.system.setConfig(newConfig);

        expect(mockZeroclaw.system.setConfig).toHaveBeenCalledWith(newConfig);
      });
    });

    describe('日志订阅', () => {
      it('应该正确订阅日志事件', () => {
        const callback = vi.fn();
        const unsubscribe = window.zeroclaw.system.onLog(callback);

        expect(mockZeroclaw.system.onLog).toHaveBeenCalledWith(callback);
        expect(typeof unsubscribe).toBe('function');
      });
    });
  });

  describe('错误处理', () => {
    it('应该正确处理API错误', async () => {
      mockZeroclaw.chat.send.mockRejectedValueOnce(new Error('Network error'));

      await expect(window.zeroclaw.chat.send('test')).rejects.toThrow('Network error');
    });

    it('应该正确处理无效参数', async () => {
      mockZeroclaw.workflow.get.mockResolvedValueOnce(null);

      const result = await window.zeroclaw.workflow.get('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('并发请求', () => {
    it('应该正确处理并发请求', async () => {
      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce([]);
      mockZeroclaw.swarm.listTasks.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);

      const [sessions, tasks, workflows] = await Promise.all([
        window.zeroclaw.chat.sessions.list(),
        window.zeroclaw.swarm.listTasks(),
        window.zeroclaw.workflow.list(),
      ]);

      expect(sessions).toEqual([]);
      expect(tasks).toEqual([]);
      expect(workflows).toEqual([]);
    });
  });
});
