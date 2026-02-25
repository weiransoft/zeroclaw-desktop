import { useEffect, useCallback, useState, useRef } from 'react';
import { useSwarmStore } from '@/stores/swarmStore';
import { SwarmMessage, SwarmTask, ConsensusState } from '@/types';

export function useSwarm() {
  const {
    tasks,
    messages,
    consensus,
    selectedTaskId,
    loading,
    setTasks,
    addTask,
    updateTask,
    setMessages,
    addMessage,
    setConsensus,
    setSelectedTask,
    setLoading,
  } = useSwarmStore();

  const [streamingMessage, setStreamingMessage] = useState<{ author: string; content: string } | null>(null);
  const streamingMessageRef = useRef<{ author: string; content: string } | null>(null);

  // 保持 ref 与 state 同步
  useEffect(() => {
    streamingMessageRef.current = streamingMessage;
  }, [streamingMessage]);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    const unsubscribe = window.zeroclaw.swarm.onMessage((msg) => {
      addMessage(msg as SwarmMessage);
      setStreamingMessage(null);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [addMessage]);

  useEffect(() => {
    const unsubscribe = window.zeroclaw.swarm.onTaskUpdate((task) => {
      const swarmTask = task as SwarmTask;
      updateTask(swarmTask);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [updateTask]);

  useEffect(() => {
    const unsubscribe = window.zeroclaw.swarm.onConsensus((state) => {
      setConsensus(state as ConsensusState);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [setConsensus]);

  useEffect(() => {
    const unsubscribe = window.zeroclaw.chat.onStreamStart?.((data) => {
      if (data.sessionId && data.author) {
        setStreamingMessage({ author: data.author, content: '' });
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = window.zeroclaw.chat.onStreamChunk?.((data) => {
      // 使用 ref 获取最新值，避免依赖 streamingMessage 导致重复订阅
      if (data.accumulated && streamingMessageRef.current) {
        setStreamingMessage({ ...streamingMessageRef.current, content: data.accumulated });
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = window.zeroclaw.chat.onStreamEnd?.(() => {
      setStreamingMessage(null);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const taskList = await window.zeroclaw.swarm.listTasks();
      setTasks(taskList);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [setTasks, setLoading]);

  const loadMessages = useCallback(async (runId?: string, taskId?: string, limit?: number) => {
    try {
      setLoading(true);
      const messageList = await window.zeroclaw.swarm.getMessages(runId, taskId, limit);
      setMessages(messageList);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }, [setMessages, setLoading]);

  const loadConsensus = useCallback(async (taskId: string) => {
    try {
      const state = await window.zeroclaw.swarm.getConsensus(taskId);
      setConsensus(state);
    } catch (err) {
      console.error('Failed to load consensus:', err);
    }
  }, [setConsensus]);

  const selectTask = useCallback(async (taskId: string) => {
    setSelectedTask(taskId);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      await loadMessages(task.runId, taskId);
      await loadConsensus(taskId);
    }
  }, [tasks, setSelectedTask, loadMessages, loadConsensus]);

  const refreshTasks = useCallback(async () => {
    await loadTasks();
  }, [loadTasks]);

  return {
    tasks,
    messages,
    consensus,
    selectedTaskId,
    loading,
    streamingMessage,
    loadTasks,
    loadMessages,
    loadConsensus,
    selectTask,
    setSelectedTask,
    refreshTasks,
  };
}
