import { create } from 'zustand';
import { Message, Session, ChatState } from '@/types';

interface ChatStore extends ChatState {
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setSessions: (sessions: Session[]) => void;
  setCurrentSession: (sessionId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  reset: () => void;
}

const initialState: ChatState = {
  messages: [],
  sessions: [],
  currentSessionId: null,
  loading: false,
  streaming: false,
  error: null,
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,

  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),
  setLoading: (loading) => set({ loading }),
  setStreaming: (streaming) => set({ streaming }),
  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [] }),
  reset: () => set(initialState),
}));
