import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkflow } from '@/hooks/useWorkflow';
import { mockZeroclaw } from '../setup';
import { Workflow, WorkflowStep } from '@/types';

describe('useWorkflow Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该返回正确的初始状态', async () => {
      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useWorkflow());

      await waitFor(() => {
        expect(result.current.workflows).toEqual([]);
        expect(result.current.templates).toEqual([]);
        expect(result.current.selectedWorkflowId).toBeNull();
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('loadWorkflows', () => {
    it('应该正确加载工作流列表', async () => {
      const mockWorkflows: Workflow[] = [
        {
          id: 'w1',
          name: 'Workflow 1',
          description: 'Test workflow',
          status: 'created',
          roles: ['agent1'],
          steps: [],
          createdAt: 1000,
          updatedAt: 2000,
        },
        {
          id: 'w2',
          name: 'Workflow 2',
          description: 'Another workflow',
          status: 'running',
          roles: ['agent1', 'agent2'],
          steps: [],
          createdAt: 3000,
          updatedAt: 4000,
        },
      ];

      mockZeroclaw.workflow.list.mockResolvedValueOnce(mockWorkflows);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useWorkflow());

      await waitFor(() => {
        expect(result.current.workflows).toEqual(mockWorkflows);
      });
      expect(mockZeroclaw.workflow.list).toHaveBeenCalled();
    });

    it('应该处理加载工作流失败', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockZeroclaw.workflow.list.mockRejectedValueOnce(new Error('Network error'));
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.loadWorkflows();
      });

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('loadTemplates', () => {
    it('应该正确加载模板列表', async () => {
      const mockTemplates = [
        {
          id: 't1',
          name: 'Template 1',
          description: 'Test template',
          author: 'Author1',
          createdAt: 1000,
        },
      ];

      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce(mockTemplates);

      const { result } = renderHook(() => useWorkflow());

      await waitFor(() => {
        expect(result.current.templates).toEqual(mockTemplates);
      });
    });
  });

  describe('createWorkflow', () => {
    it('应该创建新工作流', async () => {
      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);
      
      const newWorkflow: Workflow = {
        id: 'new-workflow-id',
        name: 'New Workflow',
        description: 'Description',
        status: 'created',
        roles: ['agent1'],
        steps: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockZeroclaw.workflow.create.mockResolvedValueOnce(newWorkflow);

      const { result } = renderHook(() => useWorkflow());

      const config = {
        name: 'New Workflow',
        description: 'Description',
        roles: ['agent1'],
        steps: [] as WorkflowStep[],
      };

      let created;
      await act(async () => {
        created = await result.current.createWorkflow(config);
      });

      expect(created).toEqual(newWorkflow);
      expect(result.current.workflows).toContainEqual(newWorkflow);
      expect(mockZeroclaw.workflow.create).toHaveBeenCalledWith(config);
    });

    it('应该处理创建工作流失败', async () => {
      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);
      
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockZeroclaw.workflow.create.mockRejectedValueOnce(new Error('Create failed'));

      const { result } = renderHook(() => useWorkflow());

      const config = {
        name: 'Test',
        description: '',
        roles: [],
        steps: [] as WorkflowStep[],
      };

      await expect(async () => {
        await result.current.createWorkflow(config);
      }).rejects.toThrow('Create failed');

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('autoGenerate', () => {
    it('应该自动生成工作流', async () => {
      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);
      
      const generatedWorkflow: Workflow = {
        id: 'generated-id',
        name: 'Generated Workflow',
        description: 'Auto-generated',
        status: 'created',
        roles: ['agent1', 'agent2'],
        steps: [
          {
            name: 'Step 1',
            description: 'First step',
            assignedTo: 'agent1',
            dependencies: [],
            status: 'pending',
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockZeroclaw.workflow.autoGenerate.mockResolvedValueOnce(generatedWorkflow);

      const { result } = renderHook(() => useWorkflow());

      let generated;
      await act(async () => {
        generated = await window.zeroclaw.workflow.autoGenerate('Create a scrum workflow');
      });

      expect(generated).toEqual(generatedWorkflow);
      expect(mockZeroclaw.workflow.autoGenerate).toHaveBeenCalledWith('Create a scrum workflow');
    });

    it('应该处理自动生成失败', async () => {
      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);
      
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockZeroclaw.workflow.autoGenerate.mockRejectedValueOnce(new Error('Generation failed'));

      const { result } = renderHook(() => useWorkflow());

      await expect(async () => {
        await window.zeroclaw.workflow.autoGenerate('test prompt');
      }).rejects.toThrow('Generation failed');

      consoleError.mockRestore();
    });
  });

  describe('工作流控制操作', () => {
    it('startWorkflow应该启动工作流', async () => {
      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.startWorkflow('workflow-id');
      });

      expect(mockZeroclaw.workflow.start).toHaveBeenCalledWith('workflow-id');
    });

    it('pauseWorkflow应该暂停工作流', async () => {
      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.pauseWorkflow('workflow-id');
      });

      expect(mockZeroclaw.workflow.pause).toHaveBeenCalledWith('workflow-id');
    });

    it('resumeWorkflow应该恢复工作流', async () => {
      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.resumeWorkflow('workflow-id');
      });

      expect(mockZeroclaw.workflow.resume).toHaveBeenCalledWith('workflow-id');
    });

    it('stopWorkflow应该停止工作流', async () => {
      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.stopWorkflow('workflow-id');
      });

      expect(mockZeroclaw.workflow.stop).toHaveBeenCalledWith('workflow-id');
    });

    it('应该处理控制操作失败', async () => {
      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);
      
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockZeroclaw.workflow.start.mockRejectedValueOnce(new Error('Start failed'));

      const { result } = renderHook(() => useWorkflow());

      await expect(async () => {
        await result.current.startWorkflow('workflow-id');
      }).rejects.toThrow('Start failed');

      consoleError.mockRestore();
    });
  });

  describe('selectWorkflow', () => {
    it('应该选择工作流', async () => {
      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.selectWorkflow('workflow-id');
      });

      expect(result.current.selectedWorkflowId).toBe('workflow-id');
    });
  });

  describe('getSelectedWorkflow', () => {
    it('应该返回选中的工作流', async () => {
      const mockWorkflow: Workflow = {
        id: 'w1',
        name: 'Selected Workflow',
        description: 'Test',
        status: 'created',
        roles: [],
        steps: [],
        createdAt: 1000,
        updatedAt: 2000,
      };

      mockZeroclaw.workflow.list.mockResolvedValueOnce([mockWorkflow]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useWorkflow());

      await waitFor(() => {
        expect(result.current.workflows).toHaveLength(1);
      });

      await act(async () => {
        await result.current.selectWorkflow('w1');
      });

      expect(result.current.selectedWorkflowId).toBe('w1');
    });

    it('没有选中工作流时应该返回null', async () => {
      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);
      
      const { result } = renderHook(() => useWorkflow());

      await waitFor(() => {
        expect(result.current.selectedWorkflowId).toBeNull();
      });
    });
  });

  describe('事件订阅', () => {
    it('应该订阅工作流更新事件', async () => {
      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);
      
      renderHook(() => useWorkflow());

      await waitFor(() => {
        expect(mockZeroclaw.workflow.onUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('复杂场景测试', () => {
    it('应该正确处理完整的工作流生命周期', async () => {
      mockZeroclaw.workflow.list.mockResolvedValueOnce([]);
      mockZeroclaw.workflow.templates.list.mockResolvedValueOnce([]);
      
      const workflow: Workflow = {
        id: 'w1',
        name: 'Lifecycle Test',
        description: 'Test',
        status: 'created',
        roles: ['agent1'],
        steps: [],
        createdAt: 1000,
        updatedAt: 1000,
      };

      mockZeroclaw.workflow.create.mockResolvedValueOnce(workflow);
      mockZeroclaw.workflow.start.mockResolvedValueOnce(undefined);
      mockZeroclaw.workflow.pause.mockResolvedValueOnce(undefined);
      mockZeroclaw.workflow.resume.mockResolvedValueOnce(undefined);
      mockZeroclaw.workflow.stop.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.createWorkflow({
          name: 'Lifecycle Test',
          description: 'Test',
          roles: ['agent1'],
          steps: [],
        });
      });

      expect(result.current.workflows).toHaveLength(1);

      await act(async () => {
        await result.current.selectWorkflow('w1');
      });

      expect(result.current.selectedWorkflowId).toBe('w1');

      await act(async () => {
        await result.current.startWorkflow('w1');
      });

      await act(async () => {
        await result.current.pauseWorkflow('w1');
      });

      await act(async () => {
        await result.current.resumeWorkflow('w1');
      });

      await act(async () => {
        await result.current.stopWorkflow('w1');
      });

      expect(mockZeroclaw.workflow.start).toHaveBeenCalledTimes(1);
      expect(mockZeroclaw.workflow.pause).toHaveBeenCalledTimes(1);
      expect(mockZeroclaw.workflow.resume).toHaveBeenCalledTimes(1);
      expect(mockZeroclaw.workflow.stop).toHaveBeenCalledTimes(1);
    });
  });
});
