import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/ui/input';

describe('Input Component', () => {
  describe('渲染', () => {
    it('应该正确渲染输入框', () => {
      render(<Input placeholder="Enter text" />);

      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toBeInTheDocument();
    });

    it('应该正确显示值', () => {
      render(<Input value="test value" readOnly />);

      const input = screen.getByDisplayValue('test value');
      expect(input).toBeInTheDocument();
    });
  });

  describe('类型', () => {
    it('应该支持text类型', () => {
      render(<Input type="text" />);

      const input = document.querySelector('input[type="text"]');
      expect(input).toBeInTheDocument();
    });

    it('应该支持password类型', () => {
      render(<Input type="password" />);

      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('应该支持email类型', () => {
      render(<Input type="email" />);

      const input = document.querySelector('input[type="email"]');
      expect(input).toBeInTheDocument();
    });
  });

  describe('交互', () => {
    it('输入时应该调用onChange处理器', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });

      expect(handleChange).toHaveBeenCalled();
    });

    it('聚焦时应该调用onFocus处理器', () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      expect(handleFocus).toHaveBeenCalled();
    });

    it('失焦时应该调用onBlur处理器', () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);

      const input = screen.getByRole('textbox');
      fireEvent.blur(input);

      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('禁用状态', () => {
    it('禁用时应该有disabled属性', () => {
      render(<Input disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('禁用时应该有正确的样式', () => {
      render(<Input disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('disabled:cursor-not-allowed');
    });
  });

  describe('自定义className', () => {
    it('应该合并自定义className', () => {
      render(<Input className="custom-input" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-input');
      expect(input).toHaveClass('flex');
    });
  });

  describe('占位符', () => {
    it('应该显示占位符文本', () => {
      render(<Input placeholder="Type here..." />);

      const input = screen.getByPlaceholderText('Type here...');
      expect(input).toBeInTheDocument();
    });
  });

  describe('ref转发', () => {
    it('应该正确转发ref', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('可访问性', () => {
    it('应该支持aria属性', () => {
      render(
        <Input
          aria-label="Search"
          aria-describedby="search-hint"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Search');
      expect(input).toHaveAttribute('aria-describedby', 'search-hint');
    });
  });
});
