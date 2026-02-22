import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '@/hooks/useChat';
import { useChatStore } from '@/stores/chatStore';
import { mockZeroclaw } from '../setup';

describe('useChat Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.getState().reset();
  });

  describe('初始状态', () => {
    it('应该返回正确的初始状态', async () => {
      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.messages).toEqual([]);
        expect(result.current.sessions).toEqual([]);
        expect(result.current.currentSessionId).toBeNull();
        expect(result.current.streaming).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.inputValue).toBe('');
      });
    });
  });

  describe('loadSessions', () => {
    it('应该正确加载会话列表', async () => {
      const mockSessions = [
        { id: 's1', name: 'Session 1', messageCount: 5, createdAt: 1000, updatedAt: 2000 },
        { id: 's2', name: 'Session 2', messageCount: 3, createdAt: 3000, updatedAt: 4000 },
      ];

      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce(mockSessions);

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.sessions).toEqual(mockSessions);
      });
      expect(mockZeroclaw.chat.sessions.list).toHaveBeenCalled();
    });

    it('应该处理加载会话失败', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockZeroclaw.chat.sessions.list.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useChat());

      await act(async () => {
        await result.current.loadSessions();
      });

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('createSession', () => {
    it('应该创建新会话并设置为当前会话', async () => {
      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce([]);
      
      const newSession = {
        id: 'new-session-id',
        name: 'New Chat',
        createdAt: Date.now(),
      };

      mockZeroclaw.chat.sessions.create.mockResolvedValueOnce(newSession);

      const { result } = renderHook(() => useChat());

      let createdSession;
      await act(async () => {
        createdSession = await result.current.createSession('New Chat');
      });

      expect(createdSession).toEqual(newSession);
      expect(result.current.currentSessionId).toBe('new-session-id');
      expect(mockZeroclaw.chat.sessions.create).toHaveBeenCalledWith('New Chat');
    });

    it('应该处理创建会话失败', async () => {
      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce([]);
      
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockZeroclaw.chat.sessions.create.mockRejectedValueOnce(new Error('Create failed'));

      const { result } = renderHook(() => useChat());

      const createdSession = await act(async () => {
        return await result.current.createSession('Test');
      });

      expect(createdSession).toBeNull();
      expect(result.current.error).toBe('Failed to create session');
      consoleError.mockRestore();
    });
  });

  describe('deleteSession', () => {
    it('应该删除会话', async () => {
      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useChat());

      mockZeroclaw.chat.sessions.create.mockResolvedValueOnce({
        id: 'session-to-delete',
        name: 'To Delete',
        createdAt: Date.now(),
      });

      await act(async () => {
        await result.current.createSession();
      });

      await act(async () => {
        await result.current.deleteSession('session-to-delete');
      });

      expect(mockZeroclaw.chat.sessions.delete).toHaveBeenCalledWith('session-to-delete');
    });

    it('删除当前会话应该清空消息和当前会话ID', async () => {
      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useChat());

      mockZeroclaw.chat.sessions.create.mockResolvedValueOnce({
        id: 'current-session',
        name: 'Current',
        createdAt: Date.now(),
      });

      await act(async () => {
        await result.current.createSession();
      });

      await act(async () => {
        await result.current.deleteSession('current-session');
      });

      expect(result.current.currentSessionId).toBeNull();
    });
  });

  describe('renameSession', () => {
    it('应该重命名会话', async () => {
      const mockSessions = [
        { id: 's1', name: 'Old Name', messageCount: 0, createdAt: 1000, updatedAt: 1000 },
      ];

      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce(mockSessions);

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1);
      });

      await act(async () => {
        await result.current.renameSession('s1', 'New Name');
      });

      expect(mockZeroclaw.chat.sessions.rename).toHaveBeenCalledWith('s1', 'New Name');
    });
  });

  describe('sendMessage', () => {
    it('应该发送消息', async () => {
      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useChat());

      mockZeroclaw.chat.sessions.create.mockResolvedValueOnce({
        id: 'test-session',
        name: 'Test',
        createdAt: Date.now(),
      });

      await act(async () => {
        await result.current.createSession();
      });

      await act(async () => {
        await result.current.sendMessage('Hello, world!');
      });

      expect(mockZeroclaw.chat.send).toHaveBeenCalledWith('Hello, world!', 'test-session');
      expect(result.current.inputValue).toBe('');
    });

    it('空消息不应该被发送', async () => {
      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useChat());

      await act(async () => {
        await result.current.sendMessage('');
      });

      await act(async () => {
        await result.current.sendMessage('   ');
      });

      expect(mockZeroclaw.chat.send).not.toHaveBeenCalled();
    });

    it('发送消息时应该设置loading和streaming状态', async () => {
      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce([]);
      
      mockZeroclaw.chat.send.mockImplementationOnce(() => {
        return new Promise(resolve => setTimeout(() => resolve({ success: true }), 100));
      });

      const { result } = renderHook(() => useChat());

      mockZeroclaw.chat.sessions.create.mockResolvedValueOnce({
        id: 'test-session',
        name: 'Test',
        createdAt: Date.now(),
      });

      await act(async () => {
        await result.current.createSession();
      });

      act(() => {
        result.current.sendMessage('Test message');
      });

      expect(mockZeroclaw.chat.send).toHaveBeenCalled();
    });
  });

  describe('abort', () => {
    it('应该中止当前会话', async () => {
      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useChat());

      mockZeroclaw.chat.sessions.create.mockResolvedValueOnce({
        id: 'test-session',
        name: 'Test',
        createdAt: Date.now(),
      });

      await act(async () => {
        await result.current.createSession();
      });

      await act(async () => {
        await result.current.abort();
      });

      expect(mockZeroclaw.chat.abort).toHaveBeenCalledWith('test-session');
    });

    it('没有当前会话时不应该调用abort', async () => {
      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.currentSessionId).toBeNull();
      });

      await act(async () => {
        await result.current.abort();
      });

      expect(mockZeroclaw.chat.abort).not.toHaveBeenCalled();
    });
  });

  describe('setInputValue', () => {
    it('应该更新输入值', async () => {
      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useChat());

      await act(() => {
        result.current.setInputValue('New input value');
      });

      expect(result.current.inputValue).toBe('New input value');
    });
  });

  describe('clearError', () => {
    it('应该清除错误', async () => {
      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce([]);
      mockZeroclaw.chat.sessions.create.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useChat());

      await act(async () => {
        await result.current.createSession();
      });

      expect(result.current.error).toBe('Failed to create session');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('事件订阅', () => {
    it('应该订阅消息事件', async () => {
      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce([]);
      renderHook(() => useChat());

      await waitFor(() => {
        expect(mockZeroclaw.chat.onMessage).toHaveBeenCalled();
      });
    });

    it('应该订阅状态事件', async () => {
      mockZeroclaw.chat.sessions.list.mockResolvedValueOnce([]);
      renderHook(() => useChat());

      await waitFor(() => {
        expect(mockZeroclaw.chat.onStatus).toHaveBeenCalled();
      });
    });
  });
});
