import { describe, it, expect, beforeEach } from 'vitest';
import { useSwarmStore } from '@/stores/swarmStore';
import { SwarmMessage, SwarmTask, ConsensusState } from '@/types';

describe('SwarmStore', () => {
  beforeEach(() => {
    useSwarmStore.setState({
      tasks: [],
      messages: [],
      consensus: null,
      selectedTaskId: null,
      loading: false,
    });
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useSwarmStore.getState();

      expect(state.tasks).toEqual([]);
      expect(state.messages).toEqual([]);
      expect(state.consensus).toBeNull();
      expect(state.selectedTaskId).toBeNull();
      expect(state.loading).toBe(false);
    });
  });

  describe('setTasks', () => {
    it('应该正确设置任务列表', () => {
      const tasks: SwarmTask[] = [
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

      useSwarmStore.getState().setTasks(tasks);

      expect(useSwarmStore.getState().tasks).toEqual(tasks);
    });
  });

  describe('addTask', () => {
    it('应该添加任务到列表开头', () => {
      const existingTask: SwarmTask = {
        id: 't1',
        runId: 'r1',
        agentName: 'Agent1',
        task: 'Existing Task',
        status: 'completed',
        depth: 0,
        createdAt: 1000,
        updatedAt: 2000,
      };

      const newTask: SwarmTask = {
        id: 't2',
        runId: 'r2',
        agentName: 'Agent2',
        task: 'New Task',
        status: 'running',
        depth: 0,
        createdAt: 3000,
        updatedAt: 4000,
      };

      useSwarmStore.getState().setTasks([existingTask]);
      useSwarmStore.getState().addTask(newTask);

      const tasks = useSwarmStore.getState().tasks;
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toEqual(newTask);
      expect(tasks[1]).toEqual(existingTask);
    });
  });

  describe('updateTask', () => {
    it('应该更新现有任务', () => {
      const task: SwarmTask = {
        id: 't1',
        runId: 'r1',
        agentName: 'Agent1',
        task: 'Original Task',
        status: 'running',
        depth: 0,
        createdAt: 1000,
        updatedAt: 2000,
      };

      useSwarmStore.getState().setTasks([task]);

      const updatedTask: SwarmTask = {
        ...task,
        status: 'completed',
        updatedAt: 3000,
      };

      useSwarmStore.getState().updateTask(updatedTask);

      const tasks = useSwarmStore.getState().tasks;
      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe('completed');
    });

    it('不应该影响其他任务', () => {
      const task1: SwarmTask = {
        id: 't1',
        runId: 'r1',
        agentName: 'Agent1',
        task: 'Task 1',
        status: 'running',
        depth: 0,
        createdAt: 1000,
        updatedAt: 2000,
      };

      const task2: SwarmTask = {
        id: 't2',
        runId: 'r1',
        agentName: 'Agent2',
        task: 'Task 2',
        status: 'pending',
        depth: 1,
        createdAt: 3000,
        updatedAt: 4000,
      };

      useSwarmStore.getState().setTasks([task1, task2]);

      useSwarmStore.getState().updateTask({
        ...task1,
        status: 'completed',
      });

      const tasks = useSwarmStore.getState().tasks;
      expect(tasks[0].status).toBe('completed');
      expect(tasks[1].status).toBe('pending');
    });
  });

  describe('setMessages', () => {
    it('应该正确设置消息列表', () => {
      const messages: SwarmMessage[] = [
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

      useSwarmStore.getState().setMessages(messages);

      expect(useSwarmStore.getState().messages).toEqual(messages);
    });
  });

  describe('addMessage', () => {
    it('应该追加消息到列表', () => {
      const message1: SwarmMessage = {
        id: 'm1',
        runId: 'r1',
        taskId: 't1',
        author: 'Agent1',
        authorType: 'agent',
        messageType: 'task_assignment',
        content: 'First message',
        timestamp: 1000,
      };

      const message2: SwarmMessage = {
        id: 'm2',
        runId: 'r1',
        taskId: 't1',
        author: 'Agent2',
        authorType: 'agent',
        messageType: 'task_status',
        content: 'Second message',
        timestamp: 2000,
      };

      useSwarmStore.getState().addMessage(message1);
      useSwarmStore.getState().addMessage(message2);

      const messages = useSwarmStore.getState().messages;
      expect(messages).toHaveLength(2);
      expect(messages[1]).toEqual(message2);
    });
  });

  describe('setConsensus', () => {
    it('应该正确设置共识状态', () => {
      const consensus: ConsensusState = {
        taskId: 't1',
        status: 'pending',
        participants: ['Agent1', 'Agent2'],
        agreements: ['Agent1'],
        disagreements: ['Agent2'],
      };

      useSwarmStore.getState().setConsensus(consensus);

      expect(useSwarmStore.getState().consensus).toEqual(consensus);
    });

    it('应该能清空共识状态', () => {
      const consensus: ConsensusState = {
        taskId: 't1',
        status: 'agreed',
        participants: ['Agent1'],
        agreements: ['Agent1'],
        disagreements: [],
      };

      useSwarmStore.getState().setConsensus(consensus);
      useSwarmStore.getState().setConsensus(null);

      expect(useSwarmStore.getState().consensus).toBeNull();
    });
  });

  describe('setSelectedTask', () => {
    it('应该正确设置选中的任务ID', () => {
      useSwarmStore.getState().setSelectedTask('task-123');

      expect(useSwarmStore.getState().selectedTaskId).toBe('task-123');
    });

    it('应该能清空选中的任务ID', () => {
      useSwarmStore.getState().setSelectedTask('task-123');
      useSwarmStore.getState().setSelectedTask(null);

      expect(useSwarmStore.getState().selectedTaskId).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('应该正确设置loading状态', () => {
      useSwarmStore.getState().setLoading(true);
      expect(useSwarmStore.getState().loading).toBe(true);

      useSwarmStore.getState().setLoading(false);
      expect(useSwarmStore.getState().loading).toBe(false);
    });
  });

  describe('复杂场景测试', () => {
    it('应该正确处理完整的任务生命周期', () => {
      // 创建任务
      const task: SwarmTask = {
        id: 't1',
        runId: 'r1',
        agentName: 'Agent1',
        task: 'Test Task',
        status: 'pending',
        depth: 0,
        createdAt: 1000,
        updatedAt: 1000,
      };

      useSwarmStore.getState().addTask(task);
      expect(useSwarmStore.getState().tasks).toHaveLength(1);

      // 选择任务
      useSwarmStore.getState().setSelectedTask('t1');
      expect(useSwarmStore.getState().selectedTaskId).toBe('t1');

      // 添加消息
      const message: SwarmMessage = {
        id: 'm1',
        runId: 'r1',
        taskId: 't1',
        author: 'Agent1',
        authorType: 'agent',
        messageType: 'task_status',
        content: 'Task started',
        timestamp: 2000,
      };
      useSwarmStore.getState().addMessage(message);
      expect(useSwarmStore.getState().messages).toHaveLength(1);

      // 更新任务状态
      useSwarmStore.getState().updateTask({ ...task, status: 'running' });
      expect(useSwarmStore.getState().tasks[0].status).toBe('running');

      // 设置共识
      const consensus: ConsensusState = {
        taskId: 't1',
        status: 'agreed',
        participants: ['Agent1'],
        agreements: ['Agent1'],
        disagreements: [],
      };
      useSwarmStore.getState().setConsensus(consensus);
      expect(useSwarmStore.getState().consensus?.status).toBe('agreed');

      // 完成任务
      useSwarmStore.getState().updateTask({ ...task, status: 'completed' });
      expect(useSwarmStore.getState().tasks[0].status).toBe('completed');
    });
  });
});
