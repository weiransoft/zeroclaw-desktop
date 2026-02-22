import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowList } from '@/components/workflow/WorkflowList';
import { Workflow } from '@/types';

describe('WorkflowList Component', () => {
  const mockWorkflows: Workflow[] = [
    {
      id: 'w1',
      name: 'Running Workflow',
      description: 'A running workflow',
      status: 'running',
      roles: ['agent1'],
      steps: [
        { name: 'Step 1', description: '', assignedTo: 'agent1', dependencies: [], status: 'completed' },
        { name: 'Step 2', description: '', assignedTo: 'agent1', dependencies: [], status: 'running' },
      ],
      createdAt: 1000,
      updatedAt: 2000,
    },
    {
      id: 'w2',
      name: 'Completed Workflow',
      description: 'A completed workflow',
      status: 'completed',
      roles: ['agent1', 'agent2'],
      steps: [
        { name: 'Step 1', description: '', assignedTo: 'agent1', dependencies: [], status: 'completed' },
      ],
      createdAt: 3000,
      updatedAt: 4000,
    },
    {
      id: 'w3',
      name: 'Created Workflow',
      description: 'A created workflow',
      status: 'created',
      roles: [],
      steps: [],
      createdAt: 5000,
      updatedAt: 6000,
    },
  ];

  const defaultProps = {
    workflows: mockWorkflows,
    selectedWorkflowId: null,
    onSelect: vi.fn(),
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染', () => {
    it('应该渲染所有工作流', () => {
      render(<WorkflowList {...defaultProps} />);

      expect(screen.getByText('Running Workflow')).toBeInTheDocument();
      expect(screen.getByText('Completed Workflow')).toBeInTheDocument();
      expect(screen.getByText('Created Workflow')).toBeInTheDocument();
    });

    it('应该显示工作流描述', () => {
      render(<WorkflowList {...defaultProps} />);

      expect(screen.getByText('A running workflow')).toBeInTheDocument();
    });

    it('应该显示步骤数量', () => {
      render(<WorkflowList {...defaultProps} />);

      expect(screen.getByText('2 步骤')).toBeInTheDocument();
      expect(screen.getByText('1 步骤')).toBeInTheDocument();
    });
  });

  describe('状态显示', () => {
    it('应该显示运行中状态', () => {
      render(<WorkflowList {...defaultProps} />);

      expect(screen.getByText('运行中')).toBeInTheDocument();
    });

    it('应该显示已完成状态', () => {
      render(<WorkflowList {...defaultProps} />);

      expect(screen.getByText('已完成')).toBeInTheDocument();
    });

    it('应该显示已创建状态', () => {
      render(<WorkflowList {...defaultProps} />);

      expect(screen.getByText('已创建')).toBeInTheDocument();
    });
  });

  describe('选择交互', () => {
    it('点击工作流应该调用onSelect', () => {
      const handleSelect = vi.fn();
      render(<WorkflowList {...defaultProps} onSelect={handleSelect} />);

      fireEvent.click(screen.getByText('Running Workflow'));

      expect(handleSelect).toHaveBeenCalledWith('w1');
    });

    it('选中的工作流应该有高亮样式', () => {
      render(<WorkflowList {...defaultProps} selectedWorkflowId="w1" />);

      // 找到包含工作流名称的容器div
      const workflowItem = screen.getByText('Running Workflow').closest('div[class*="cursor-pointer"]');
      expect(workflowItem).toHaveClass('bg-dark-800');
    });
  });

  describe('空状态', () => {
    it('没有工作流时应该显示提示', () => {
      render(<WorkflowList {...defaultProps} workflows={[]} />);

      expect(screen.getByText('暂无工作流')).toBeInTheDocument();
    });
  });

  describe('加载状态', () => {
    it('loading时应该显示加载指示器', () => {
      render(<WorkflowList {...defaultProps} workflows={[]} loading={true} />);

      // 查找加载指示器
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });
});
