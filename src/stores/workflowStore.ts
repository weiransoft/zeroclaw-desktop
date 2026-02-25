import { create } from 'zustand';
import { Workflow, WorkflowTemplate } from '@/types';

interface WorkflowStore {
  workflows: Workflow[];
  templates: WorkflowTemplate[];
  selectedWorkflowId: string | null;
  loading: boolean;

  // Actions
  setWorkflows: (workflows: Workflow[]) => void;
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (workflow: Partial<Workflow> & { id: string }) => void;
  upsertWorkflow: (workflow: Workflow) => void;
  removeWorkflow: (id: string) => void;
  setTemplates: (templates: WorkflowTemplate[]) => void;
  setSelectedWorkflow: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  workflows: [],
  templates: [],
  selectedWorkflowId: null,
  loading: false,

  setWorkflows: (workflows) => set({ workflows }),
  addWorkflow: (workflow) => set((state) => ({ 
    workflows: [workflow, ...state.workflows] 
  })),
  updateWorkflow: (workflow) => set((state) => {
    const exists = state.workflows.some(w => w.id === workflow.id);
    if (exists) {
      return {
        workflows: state.workflows.map((w) => w.id === workflow.id ? { ...w, ...workflow } as Workflow : w)
      };
    } else {
      return {
        workflows: [{ ...workflow, name: workflow.name || '', description: workflow.description || '', status: workflow.status || 'created', roles: workflow.roles || [], steps: workflow.steps || [], createdAt: workflow.createdAt || Date.now(), updatedAt: workflow.updatedAt || Date.now() } as Workflow, ...state.workflows]
      };
    }
  }),
  upsertWorkflow: (workflow) => set((state) => {
    const exists = state.workflows.some(w => w.id === workflow.id);
    if (exists) {
      return {
        workflows: state.workflows.map((w) => w.id === workflow.id ? { ...w, ...workflow } : w)
      };
    } else {
      return {
        workflows: [workflow, ...state.workflows]
      };
    }
  }),
  removeWorkflow: (id) => set((state) => ({
    workflows: state.workflows.filter((w) => w.id !== id)
  })),
  setTemplates: (templates) => set({ templates }),
  setSelectedWorkflow: (id) => set({ selectedWorkflowId: id }),
  setLoading: (loading) => set({ loading }),
}));
