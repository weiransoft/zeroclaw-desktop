import { useEffect, useCallback } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { Workflow, WorkflowTemplate, WorkflowStep } from '@/types';

export function useWorkflow() {
  const {
    workflows,
    templates,
    selectedWorkflowId,
    loading,
    setWorkflows,
    addWorkflow,
    updateWorkflow,
    setTemplates,
    setSelectedWorkflow,
    setLoading,
  } = useWorkflowStore();

  useEffect(() => {
    loadWorkflows();
    loadTemplates();
  }, []);

  useEffect(() => {
    const unsubscribe = window.zeroclaw.workflow.onUpdate((data) => {
      console.log('[useWorkflow] Received workflow update:', data);
      if (data.id) {
        updateWorkflow(data);
      } else if (data.workflow) {
        updateWorkflow(data.workflow);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [updateWorkflow]);

  const loadWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const list = await window.zeroclaw.workflow.list();
      setWorkflows(list);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setLoading(false);
    }
  }, [setWorkflows, setLoading]);

  const loadTemplates = useCallback(async () => {
    try {
      const list = await window.zeroclaw.workflow.templates?.list?.() || [];
      setTemplates(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setTemplates([]);
    }
  }, [setTemplates]);

  const createWorkflow = useCallback(async (config: {
    name: string;
    description: string;
    roles: string[];
    steps: WorkflowStep[];
  }) => {
    try {
      setLoading(true);
      const workflow = await window.zeroclaw.workflow.create(config);
      addWorkflow(workflow);
      return workflow;
    } catch (err) {
      console.error('Failed to create workflow:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [addWorkflow, setLoading]);

  const startWorkflow = useCallback(async (id: string) => {
    try {
      await window.zeroclaw.workflow.start(id);
      const workflow = await window.zeroclaw.workflow.get(id);
      updateWorkflow(workflow);
    } catch (err) {
      console.error('Failed to start workflow:', err);
    }
  }, [updateWorkflow]);

  const pauseWorkflow = useCallback(async (id: string) => {
    try {
      await window.zeroclaw.workflow.pause(id);
      const workflow = await window.zeroclaw.workflow.get(id);
      updateWorkflow(workflow);
    } catch (err) {
      console.error('Failed to pause workflow:', err);
    }
  }, [updateWorkflow]);

  const resumeWorkflow = useCallback(async (id: string) => {
    try {
      await window.zeroclaw.workflow.resume(id);
      const workflow = await window.zeroclaw.workflow.get(id);
      updateWorkflow(workflow);
    } catch (err) {
      console.error('Failed to resume workflow:', err);
    }
  }, [updateWorkflow]);

  const stopWorkflow = useCallback(async (id: string) => {
    try {
      await window.zeroclaw.workflow.stop(id);
      const workflow = await window.zeroclaw.workflow.get(id);
      updateWorkflow(workflow);
    } catch (err) {
      console.error('Failed to stop workflow:', err);
    }
  }, [updateWorkflow]);

  const selectWorkflow = useCallback(async (id: string) => {
    setSelectedWorkflow(id);
  }, [setSelectedWorkflow]);

  const refreshWorkflows = useCallback(async () => {
    await loadWorkflows();
  }, [loadWorkflows]);

  return {
    workflows,
    templates,
    selectedWorkflowId,
    loading,
    loadWorkflows,
    loadTemplates,
    createWorkflow,
    startWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    stopWorkflow,
    selectWorkflow,
    setSelectedWorkflow,
    refreshWorkflows,
  };
}
