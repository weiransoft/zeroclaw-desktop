import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utils', () => {
  describe('cn函数', () => {
    it('应该合并类名', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('应该处理条件类名', () => {
      const result = cn('base', true && 'included', false && 'excluded');
      expect(result).toBe('base included');
    });

    it('应该处理undefined和null', () => {
      const result = cn('base', undefined, null, 'end');
      expect(result).toBe('base end');
    });

    it('应该合并Tailwind冲突类', () => {
      // tailwind-merge应该处理冲突
      const result = cn('px-2', 'px-4');
      expect(result).toBe('px-4');
    });

    it('应该处理对象形式的类名', () => {
      const result = cn({
        active: true,
        disabled: false,
        primary: true,
      });
      expect(result).toContain('active');
      expect(result).toContain('primary');
      expect(result).not.toContain('disabled');
    });

    it('应该处理数组形式的类名', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
      expect(result).toContain('class3');
    });

    it('应该处理复杂的组合', () => {
      const result = cn(
        'base-class',
        { conditional: true },
        ['array-class'],
        undefined,
        'final-class'
      );
      expect(result).toContain('base-class');
      expect(result).toContain('conditional');
      expect(result).toContain('array-class');
      expect(result).toContain('final-class');
    });
  });
});
