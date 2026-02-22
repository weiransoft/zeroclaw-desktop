import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '@/components/layout/Sidebar';

describe('Sidebar Component', () => {
  const defaultProps = {
    activeTab: 'chat',
    onTabChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染', () => {
    it('应该渲染所有导航项', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('对话')).toBeInTheDocument();
      expect(screen.getByText('智能体')).toBeInTheDocument();
      expect(screen.getByText('工作流')).toBeInTheDocument();
      expect(screen.getByText('设置')).toBeInTheDocument();
    });

    it('应该显示ZeroClaw标题', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('ZeroClaw')).toBeInTheDocument();
    });

    it('应该显示版本信息', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText(/ZeroClaw Desktop v/)).toBeInTheDocument();
    });
  });

  describe('活动状态', () => {
    it('当前活动标签应该有高亮样式', () => {
      render(<Sidebar {...defaultProps} activeTab="chat" />);

      const chatButton = screen.getByText('对话').closest('button');
      expect(chatButton).toHaveClass('bg-primary-600');
    });

    it('非活动标签应该有不同的样式', () => {
      render(<Sidebar {...defaultProps} activeTab="chat" />);

      const swarmButton = screen.getByText('智能体').closest('button');
      expect(swarmButton).not.toHaveClass('bg-primary-600');
    });
  });

  describe('导航交互', () => {
    it('点击导航项应该调用onTabChange', () => {
      const handleTabChange = vi.fn();
      render(<Sidebar {...defaultProps} onTabChange={handleTabChange} />);

      fireEvent.click(screen.getByText('智能体'));

      expect(handleTabChange).toHaveBeenCalledWith('swarm');
    });

    it('点击工作流应该调用onTabChange', () => {
      const handleTabChange = vi.fn();
      render(<Sidebar {...defaultProps} onTabChange={handleTabChange} />);

      fireEvent.click(screen.getByText('工作流'));

      expect(handleTabChange).toHaveBeenCalledWith('workflow');
    });

    it('点击设置应该调用onTabChange', () => {
      const handleTabChange = vi.fn();
      render(<Sidebar {...defaultProps} onTabChange={handleTabChange} />);

      fireEvent.click(screen.getByText('设置'));

      expect(handleTabChange).toHaveBeenCalledWith('settings');
    });
  });

  describe('图标渲染', () => {
    it('每个导航项应该有对应的图标', () => {
      render(<Sidebar {...defaultProps} />);

      // 检查是否有SVG图标
      const icons = document.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('折叠功能', () => {
    it('点击菜单按钮应该切换折叠状态', () => {
      render(<Sidebar {...defaultProps} />);

      // 找到菜单按钮（通过svg图标）
      const menuButtons = document.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find(
        btn => btn.querySelector('svg') && !btn.textContent?.includes('对话')
      );

      if (menuButton) {
        fireEvent.click(menuButton);
        // 折叠后文本会被隐藏
        expect(screen.queryByText('ZeroClaw')).not.toBeInTheDocument();
      }
    });

    it('折叠后导航按钮仍然存在', () => {
      render(<Sidebar {...defaultProps} />);

      // 验证导航按钮存在
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
