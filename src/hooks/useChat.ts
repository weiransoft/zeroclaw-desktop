import { useEffect, useCallback, useState, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { Message, Session } from '@/types';

export function useChat() {
  const {
    messages,
    sessions,
    currentSessionId,
    loading,
    streaming,
    error,
    setMessages,
    addMessage,
    setSessions,
    setCurrentSession,
    setLoading,
    setStreaming,
    setError,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [status, setStatus] = useState<{ status: string; message: string } | null>(null);
  const streamingSessionRef = useRef<string | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    const unsubscribe = window.zeroclaw.chat.onMessage((msg) => {
      addMessage(msg as Message);
      setStreaming(false);
      setStreamingContent('');
      setStatus(null);
    });

    return unsubscribe;
  }, [addMessage, setStreaming]);

  useEffect(() => {
    const unsubscribe = window.zeroclaw.chat.onStatus((statusData) => {
      if (statusData.streaming !== undefined) {
        setStreaming(statusData.streaming);
      }
      if (statusData.loading !== undefined) {
        setLoading(statusData.loading);
      }
      if (statusData.status) {
        setStatus({ status: statusData.status, message: statusData.message || '' });
      }
    });

    return unsubscribe;
  }, [setLoading, setStreaming]);

  useEffect(() => {
    const onStreamStart = window.zeroclaw.chat.onStreamStart;
    if (!onStreamStart) return;
    
    const unsubscribe = onStreamStart((data) => {
      if (data.sessionId) {
        streamingSessionRef.current = data.sessionId;
        setStreamingContent('');
        setStreaming(true);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [setStreaming]);

  useEffect(() => {
    const onStreamChunk = window.zeroclaw.chat.onStreamChunk;
    if (!onStreamChunk) return;
    
    // 性能优化：使用 requestAnimationFrame 批处理渲染，减少频繁的状态更新
    const unsubscribe = onStreamChunk((data) => {
      if (data.accumulated !== undefined) {
        // 取消之前的渲染请求
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        
        // 使用 requestAnimationFrame 在下一次重绘时更新
        rafRef.current = requestAnimationFrame(() => {
          setStreamingContent(data.accumulated);
          rafRef.current = undefined;
        });
      }
    });

    return () => {
      // 清理时取消渲染请求
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [setStreamingContent]);

  useEffect(() => {
    const onStreamEnd = window.zeroclaw.chat.onStreamEnd;
    if (!onStreamEnd) return;
    
    const unsubscribe = onStreamEnd(() => {
      setStreaming(false);
      setStreamingContent('');
      setStatus(null);
      streamingSessionRef.current = null;
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [setStreaming]);

  const loadSessions = useCallback(async () => {
    try {
      const sessionList = await window.zeroclaw.chat.sessions.list();
      setSessions(sessionList);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }, [setSessions]);

  const loadHistory = useCallback(async (sessionId: string) => {
    try {
      setLoading(true);
      const history = await window.zeroclaw.chat.history(sessionId, 100);
      setMessages(history);
      setCurrentSession(sessionId);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  }, [setMessages, setCurrentSession, setLoading, setError]);

  const createSession = useCallback(async (name?: string) => {
    try {
      const session = await window.zeroclaw.chat.sessions.create(name);
      setSessions([session, ...sessions]);
      setCurrentSession(session.id);
      setMessages([]);
      return session;
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to create session');
      return null;
    }
  }, [sessions, setSessions, setCurrentSession, setMessages, setError]);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await window.zeroclaw.chat.sessions.delete(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('Failed to delete session');
    }
  }, [sessions, currentSessionId, setSessions, setCurrentSession, setMessages, setError]);

  const renameSession = useCallback(async (sessionId: string, name: string) => {
    try {
      await window.zeroclaw.chat.sessions.rename(sessionId, name);
      setSessions(sessions.map((s) => (s.id === sessionId ? { ...s, name } : s)));
    } catch (err) {
      console.error('Failed to rename session:', err);
      setError('Failed to rename session');
    }
  }, [sessions, setSessions, setError]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    let sessionId = currentSessionId;
    
    if (!sessionId) {
      const session = await createSession();
      if (!session) return;
      sessionId = session.id;
    }

    setInputValue('');
    setLoading(true);
    setStreaming(true);
    setStreamingContent('');
    setStatus({ status: 'thinking', message: '发送消息中...' });

    try {
      await window.zeroclaw.chat.send(content.trim(), sessionId);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
      setStreaming(false);
      setStreamingContent('');
      setStatus({ status: 'error', message: String(err) });
    } finally {
      setLoading(false);
    }
  }, [currentSessionId, createSession, setLoading, setStreaming, setError]);

  const abort = useCallback(async () => {
    if (currentSessionId) {
      await window.zeroclaw.chat.abort(currentSessionId);
      setStreaming(false);
      setStreamingContent('');
      setStatus(null);
    }
  }, [currentSessionId, setStreaming]);

  return {
    messages,
    sessions,
    currentSessionId,
    loading,
    streaming,
    streamingContent,
    status,
    error,
    inputValue,
    setInputValue,
    sendMessage,
    abort,
    loadHistory,
    createSession,
    deleteSession,
    renameSession,
    loadSessions,
    setCurrentSession,
    clearError: () => setError(null),
  };
}
