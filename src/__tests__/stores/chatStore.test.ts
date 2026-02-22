import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '@/stores/chatStore';
import { Message } from '@/types';

describe('ChatStore', () => {
  beforeEach(() => {
    // Reset store state
    useChatStore.setState({
      messages: [],
      sessions: [],
      currentSessionId: null,
      loading: false,
      streaming: false,
      error: null,
    });
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useChatStore.getState();
      
      expect(state.messages).toEqual([]);
      expect(state.sessions).toEqual([]);
      expect(state.currentSessionId).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.streaming).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setMessages', () => {
    it('应该正确设置消息列表', () => {
      const messages: Message[] = [
        { id: '1', sessionId: 's1', role: 'user', content: 'Hello', timestamp: 1000 },
        { id: '2', sessionId: 's1', role: 'assistant', content: 'Hi', timestamp: 2000 },
      ];

      useChatStore.getState().setMessages(messages);

      expect(useChatStore.getState().messages).toEqual(messages);
    });

    it('应该能清空消息列表', () => {
      const messages: Message[] = [
        { id: '1', sessionId: 's1', role: 'user', content: 'Hello', timestamp: 1000 },
      ];

      useChatStore.getState().setMessages(messages);
      useChatStore.getState().setMessages([]);

      expect(useChatStore.getState().messages).toEqual([]);
    });
  });

  describe('addMessage', () => {
    it('应该添加消息到空列表', () => {
      const message: Message = {
        id: '1',
        sessionId: 's1',
        role: 'user',
        content: 'Hello',
        timestamp: 1000,
      };

      useChatStore.getState().addMessage(message);

      expect(useChatStore.getState().messages).toHaveLength(1);
      expect(useChatStore.getState().messages[0]).toEqual(message);
    });

    it('应该追加消息到现有列表', () => {
      const message1: Message = {
        id: '1',
        sessionId: 's1',
        role: 'user',
        content: 'Hello',
        timestamp: 1000,
      };
      const message2: Message = {
        id: '2',
        sessionId: 's1',
        role: 'assistant',
        content: 'Hi there',
        timestamp: 2000,
      };

      useChatStore.getState().addMessage(message1);
      useChatStore.getState().addMessage(message2);

      expect(useChatStore.getState().messages).toHaveLength(2);
      expect(useChatStore.getState().messages[1]).toEqual(message2);
    });
  });

  describe('setSessions', () => {
    it('应该正确设置会话列表', () => {
      const sessions = [
        { id: 's1', name: 'Session 1', messageCount: 5, createdAt: 1000, updatedAt: 2000 },
        { id: 's2', name: 'Session 2', messageCount: 3, createdAt: 3000, updatedAt: 4000 },
      ];

      useChatStore.getState().setSessions(sessions);

      expect(useChatStore.getState().sessions).toEqual(sessions);
    });
  });

  describe('setCurrentSession', () => {
    it('应该正确设置当前会话ID', () => {
      useChatStore.getState().setCurrentSession('session-123');

      expect(useChatStore.getState().currentSessionId).toBe('session-123');
    });

    it('应该能清空当前会话ID', () => {
      useChatStore.getState().setCurrentSession('session-123');
      useChatStore.getState().setCurrentSession(null);

      expect(useChatStore.getState().currentSessionId).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('应该正确设置loading状态', () => {
      useChatStore.getState().setLoading(true);
      expect(useChatStore.getState().loading).toBe(true);

      useChatStore.getState().setLoading(false);
      expect(useChatStore.getState().loading).toBe(false);
    });
  });

  describe('setStreaming', () => {
    it('应该正确设置streaming状态', () => {
      useChatStore.getState().setStreaming(true);
      expect(useChatStore.getState().streaming).toBe(true);

      useChatStore.getState().setStreaming(false);
      expect(useChatStore.getState().streaming).toBe(false);
    });
  });

  describe('setError', () => {
    it('应该正确设置错误信息', () => {
      useChatStore.getState().setError('Something went wrong');

      expect(useChatStore.getState().error).toBe('Something went wrong');
    });

    it('应该能清空错误信息', () => {
      useChatStore.getState().setError('Error');
      useChatStore.getState().setError(null);

      expect(useChatStore.getState().error).toBeNull();
    });
  });

  describe('clearMessages', () => {
    it('应该清空所有消息', () => {
      const messages: Message[] = [
        { id: '1', sessionId: 's1', role: 'user', content: 'Hello', timestamp: 1000 },
        { id: '2', sessionId: 's1', role: 'assistant', content: 'Hi', timestamp: 2000 },
      ];

      useChatStore.getState().setMessages(messages);
      useChatStore.getState().clearMessages();

      expect(useChatStore.getState().messages).toEqual([]);
    });
  });

  describe('状态独立性', () => {
    it('多个状态更新应该正确保持其他状态', () => {
      const messages: Message[] = [
        { id: '1', sessionId: 's1', role: 'user', content: 'Hello', timestamp: 1000 },
      ];

      useChatStore.getState().setMessages(messages);
      useChatStore.getState().setLoading(true);
      useChatStore.getState().setError('Test error');
      useChatStore.getState().setCurrentSession('s1');

      const state = useChatStore.getState();
      expect(state.messages).toEqual(messages);
      expect(state.loading).toBe(true);
      expect(state.error).toBe('Test error');
      expect(state.currentSessionId).toBe('s1');
    });
  });
});
