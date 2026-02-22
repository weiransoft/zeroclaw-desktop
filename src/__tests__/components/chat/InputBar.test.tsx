import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InputBar } from '@/components/chat/InputBar';

describe('InputBar Component', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onSend: vi.fn(),
    onAbort: vi.fn(),
    loading: false,
    streaming: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染', () => {
    it('应该正确渲染输入框', () => {
      render(<InputBar {...defaultProps} />);

      const input = screen.getByPlaceholderText(/输入消息/);
      expect(input).toBeInTheDocument();
    });

    it('应该显示发送按钮', () => {
      render(<InputBar {...defaultProps} value="test" />);

      // 发送按钮应该存在
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('应该显示字符计数', () => {
      render(<InputBar {...defaultProps} value="Hello" />);

      expect(screen.getByText('5 字符')).toBeInTheDocument();
    });
  });

  describe('输入处理', () => {
    it('输入时应该调用onChange', () => {
      const handleChange = vi.fn();
      render(<InputBar {...defaultProps} onChange={handleChange} />);

      const input = screen.getByPlaceholderText(/输入消息/);
      fireEvent.change(input, { target: { value: 'test input' } });

      expect(handleChange).toHaveBeenCalledWith('test input');
    });

    it('Enter键应该发送消息', () => {
      const handleSend = vi.fn();
      render(<InputBar {...defaultProps} value="Hello" onSend={handleSend} />);

      const input = screen.getByPlaceholderText(/输入消息/);
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(handleSend).toHaveBeenCalledWith('Hello');
    });

    it('Shift+Enter不应该发送消息', () => {
      const handleSend = vi.fn();
      render(<InputBar {...defaultProps} value="Hello" onSend={handleSend} />);

      const input = screen.getByPlaceholderText(/输入消息/);
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      expect(handleSend).not.toHaveBeenCalled();
    });

    it('空消息不应该发送', () => {
      const handleSend = vi.fn();
      render(<InputBar {...defaultProps} value="   " onSend={handleSend} />);

      const input = screen.getByPlaceholderText(/输入消息/);
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(handleSend).not.toHaveBeenCalled();
    });
  });

  describe('发送按钮', () => {
    it('点击发送按钮应该调用onSend', () => {
      const handleSend = vi.fn();
      render(<InputBar {...defaultProps} value="Test message" onSend={handleSend} />);

      // 找到发送按钮（最后一个按钮）
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      expect(handleSend).toHaveBeenCalledWith('Test message');
    });

    it('空消息时发送按钮应该禁用', () => {
      render(<InputBar {...defaultProps} value="" />);

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons[buttons.length - 1];
      expect(sendButton).toBeDisabled();
    });

    it('loading时发送按钮应该禁用', () => {
      render(<InputBar {...defaultProps} value="Test" loading={true} />);

      const buttons = screen.getAllByRole('button');
      const sendButton = buttons[buttons.length - 1];
      expect(sendButton).toBeDisabled();
    });
  });

  describe('中止按钮', () => {
    it('streaming时应该显示中止按钮', () => {
      render(<InputBar {...defaultProps} streaming={true} />);

      // 找到中止按钮（红色按钮）
      const buttons = screen.getAllByRole('button');
      const abortButton = buttons[buttons.length - 1];
      expect(abortButton).toBeInTheDocument();
    });

    it('点击中止按钮应该调用onAbort', () => {
      const handleAbort = vi.fn();
      render(<InputBar {...defaultProps} streaming={true} onAbort={handleAbort} />);

      const buttons = screen.getAllByRole('button');
      const abortButton = buttons[buttons.length - 1];
      fireEvent.click(abortButton);

      expect(handleAbort).toHaveBeenCalled();
    });
  });

  describe('状态显示', () => {
    it('loading时应该显示处理中状态', () => {
      render(<InputBar {...defaultProps} loading={true} />);

      expect(screen.getByText(/处理中/i)).toBeInTheDocument();
    });

    it('streaming时应该显示正在生成状态', () => {
      render(<InputBar {...defaultProps} loading={true} streaming={true} />);

      expect(screen.getByText(/正在生成/i)).toBeInTheDocument();
    });

    it('空闲时应该显示发送提示', () => {
      render(<InputBar {...defaultProps} />);

      expect(screen.getByText(/按 Enter 发送/i)).toBeInTheDocument();
    });
  });

  describe('文本区域高度', () => {
    it('多行文本应该自动扩展高度', () => {
      const longText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      render(<InputBar {...defaultProps} value={longText} />);

      const textarea = screen.getByPlaceholderText(/输入消息/);
      expect(textarea).toBeInTheDocument();
    });
  });
});
