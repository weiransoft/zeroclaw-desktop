import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSwarm } from '@/hooks/useSwarm';
import { mockZeroclaw } from '../setup';
import { SwarmTask, SwarmMessage, ConsensusState } from '@/types';

describe('useSwarm Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该返回正确的初始状态', async () => {
      mockZeroclaw.swarm.listTasks.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useSwarm());

      await waitFor(() => {
        expect(result.current.tasks).toEqual([]);
        expect(result.current.messages).toEqual([]);
        expect(result.current.consensus).toBeNull();
        expect(result.current.selectedTaskId).toBeNull();
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('loadTasks', () => {
    it('应该正确加载任务列表', async () => {
      const mockTasks: SwarmTask[] = [
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
        {
          id: 't2',
          runId: 'r1',
          agentName: 'Agent2',
          task: 'Task 2',
          status: 'completed',
          depth: 1,
          createdAt: 3000,
          updatedAt: 4000,
        },
      ];

      mockZeroclaw.swarm.listTasks.mockResolvedValueOnce(mockTasks);

      const { result } = renderHook(() => useSwarm());

      await waitFor(() => {
        expect(result.current.tasks).toEqual(mockTasks);
      });
      expect(mockZeroclaw.swarm.listTasks).toHaveBeenCalled();
    });

    it('应该处理加载任务失败', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockZeroclaw.swarm.listTasks.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSwarm());

      await act(async () => {
        await result.current.loadTasks();
      });

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('loadMessages', () => {
    it('应该正确加载消息列表', async () => {
      mockZeroclaw.swarm.listTasks.mockResolvedValueOnce([]);
      
      const mockMessages: SwarmMessage[] = [
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

      mockZeroclaw.swarm.getMessages.mockResolvedValueOnce(mockMessages);

      const { result } = renderHook(() => useSwarm());

      await act(async () => {
        await result.current.loadMessages('r1', 't1', 50);
      });

      expect(result.current.messages).toEqual(mockMessages);
      expect(mockZeroclaw.swarm.getMessages).toHaveBeenCalledWith('r1', 't1', 50);
    });

    it('应该处理无参数调用', async () => {
      mockZeroclaw.swarm.listTasks.mockResolvedValueOnce([]);
      mockZeroclaw.swarm.getMessages.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useSwarm());

      await act(async () => {
        await result.current.loadMessages();
      });

      expect(mockZeroclaw.swarm.getMessages).toHaveBeenCalledWith(undefined, undefined, undefined);
    });
  });

  describe('loadConsensus', () => {
    it('应该正确加载共识状态', async () => {
      mockZeroclaw.swarm.listTasks.mockResolvedValueOnce([]);
      
      const mockConsensus: ConsensusState = {
        taskId: 't1',
        status: 'pending',
        participants: ['Agent1', 'Agent2'],
        agreements: ['Agent1'],
        disagreements: ['Agent2'],
      };

      mockZeroclaw.swarm.getConsensus.mockResolvedValueOnce(mockConsensus);

      const { result } = renderHook(() => useSwarm());

      await act(async () => {
        await result.current.loadConsensus('t1');
      });

      expect(result.current.consensus).toEqual(mockConsensus);
      expect(mockZeroclaw.swarm.getConsensus).toHaveBeenCalledWith('t1');
    });

    it('应该处理无共识状态', async () => {
      mockZeroclaw.swarm.listTasks.mockResolvedValueOnce([]);
      mockZeroclaw.swarm.getConsensus.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useSwarm());

      await act(async () => {
        await result.current.loadConsensus('non-existent');
      });

      expect(result.current.consensus).toBeNull();
    });
  });

  describe('selectTask', () => {
    it('应该选择任务并加载相关数据', async () => {
      const mockTask: SwarmTask = {
        id: 't1',
        runId: 'r1',
        agentName: 'Agent1',
        task: 'Test Task',
        status: 'running',
        depth: 0,
        createdAt: 1000,
        updatedAt: 2000,
      };

      const mockMessages: SwarmMessage[] = [
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

      mockZeroclaw.swarm.listTasks.mockResolvedValueOnce([mockTask]);
      mockZeroclaw.swarm.getMessages.mockResolvedValueOnce(mockMessages);
      mockZeroclaw.swarm.getConsensus.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useSwarm());

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      await act(async () => {
        await result.current.selectTask('t1');
      });

      expect(result.current.selectedTaskId).toBe('t1');
      expect(mockZeroclaw.swarm.getMessages).toHaveBeenCalledWith('r1', 't1', undefined);
      expect(mockZeroclaw.swarm.getConsensus).toHaveBeenCalledWith('t1');
    });
  });

  describe('setSelectedTask', () => {
    it('应该直接设置选中的任务ID', async () => {
      mockZeroclaw.swarm.listTasks.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useSwarm());

      act(() => {
        result.current.setSelectedTask('task-123');
      });

      expect(result.current.selectedTaskId).toBe('task-123');
    });

    it('应该能清空选中的任务ID', async () => {
      mockZeroclaw.swarm.listTasks.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useSwarm());

      act(() => {
        result.current.setSelectedTask('task-123');
      });

      act(() => {
        result.current.setSelectedTask(null);
      });

      expect(result.current.selectedTaskId).toBeNull();
    });
  });

  describe('事件订阅', () => {
    it('应该订阅消息事件', async () => {
      mockZeroclaw.swarm.listTasks.mockResolvedValueOnce([]);
      renderHook(() => useSwarm());

      await waitFor(() => {
        expect(mockZeroclaw.swarm.onMessage).toHaveBeenCalled();
      });
    });

    it('应该订阅任务更新事件', async () => {
      mockZeroclaw.swarm.listTasks.mockResolvedValueOnce([]);
      renderHook(() => useSwarm());

      await waitFor(() => {
        expect(mockZeroclaw.swarm.onTaskUpdate).toHaveBeenCalled();
      });
    });

    it('应该订阅共识更新事件', async () => {
      mockZeroclaw.swarm.listTasks.mockResolvedValueOnce([]);
      renderHook(() => useSwarm());

      await waitFor(() => {
        expect(mockZeroclaw.swarm.onConsensus).toHaveBeenCalled();
      });
    });

    it('事件回调应该正确更新状态', async () => {
      let messageCallback: (msg: SwarmMessage) => void = () => {};
      let taskCallback: (task: SwarmTask) => void = () => {};
      let consensusCallback: (state: ConsensusState) => void = () => {};

      mockZeroclaw.swarm.listTasks.mockResolvedValueOnce([]);
      mockZeroclaw.swarm.onMessage.mockImplementationOnce((cb) => {
        messageCallback = cb;
        return () => {};
      });

      mockZeroclaw.swarm.onTaskUpdate.mockImplementationOnce((cb) => {
        taskCallback = cb;
        return () => {};
      });

      mockZeroclaw.swarm.onConsensus.mockImplementationOnce((cb) => {
        consensusCallback = cb;
        return () => {};
      });

      const { result } = renderHook(() => useSwarm());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newMessage: SwarmMessage = {
        id: 'm1',
        runId: 'r1',
        taskId: 't1',
        author: 'Agent1',
        authorType: 'agent',
        messageType: 'task_status',
        content: 'New message',
        timestamp: 1000,
      };

      act(() => {
        messageCallback(newMessage);
      });

      expect(result.current.messages).toContainEqual(newMessage);

      const updatedTask: SwarmTask = {
        id: 't1',
        runId: 'r1',
        agentName: 'Agent1',
        task: 'Updated Task',
        status: 'completed',
        depth: 0,
        createdAt: 1000,
        updatedAt: 2000,
      };

      act(() => {
        taskCallback(updatedTask);
      });

      const newConsensus: ConsensusState = {
        taskId: 't1',
        status: 'agreed',
        participants: ['Agent1'],
        agreements: ['Agent1'],
        disagreements: [],
      };

      act(() => {
        consensusCallback(newConsensus);
      });

      expect(result.current.consensus).toEqual(newConsensus);
    });
  });

  describe('loading状态', () => {
    it('loadTasks应该正确设置loading状态', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockZeroclaw.swarm.listTasks.mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(() => useSwarm());

      await new Promise(r => setTimeout(r, 0));

      expect(result.current.loading).toBe(true);

      resolvePromise!([]);
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
});
