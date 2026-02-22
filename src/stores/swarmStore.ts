import { create } from 'zustand';
import { SwarmMessage, SwarmTask, ConsensusState } from '@/types';

interface SwarmStore {
  tasks: SwarmTask[];
  messages: SwarmMessage[];
  consensus: ConsensusState | null;
  selectedTaskId: string | null;
  loading: boolean;

  // Actions
  setTasks: (tasks: SwarmTask[]) => void;
  addTask: (task: SwarmTask) => void;
  updateTask: (task: SwarmTask) => void;
  setMessages: (messages: SwarmMessage[]) => void;
  addMessage: (message: SwarmMessage) => void;
  setConsensus: (consensus: ConsensusState | null) => void;
  setSelectedTask: (taskId: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useSwarmStore = create<SwarmStore>((set) => ({
  tasks: [],
  messages: [],
  consensus: null,
  selectedTaskId: null,
  loading: false,

  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ 
    tasks: [task, ...state.tasks] 
  })),
  updateTask: (task) => set((state) => ({
    tasks: state.tasks.map((t) => t.id === task.id ? task : t)
  })),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  setConsensus: (consensus) => set({ consensus }),
  setSelectedTask: (taskId) => set({ selectedTaskId: taskId }),
  setLoading: (loading) => set({ loading }),
}));
