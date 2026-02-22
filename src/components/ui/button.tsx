import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-primary-600 text-white shadow hover:bg-primary-700': variant === 'default',
            'bg-red-600 text-white shadow-sm hover:bg-red-700': variant === 'destructive',
            'border border-dark-600 bg-transparent shadow-sm hover:bg-dark-800 hover:text-dark-100': variant === 'outline',
            'bg-dark-700 text-dark-100 shadow-sm hover:bg-dark-600': variant === 'secondary',
            'hover:bg-dark-800 hover:text-dark-100': variant === 'ghost',
            'text-primary-400 underline-offset-4 hover:underline': variant === 'link',
          },
          {
            'h-9 px-4 py-2': size === 'default',
            'h-8 rounded-md px-3 text-xs': size === 'sm',
            'h-10 rounded-md px-8': size === 'lg',
            'h-9 w-9': size === 'icon',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
