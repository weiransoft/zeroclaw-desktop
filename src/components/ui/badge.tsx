import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        {
          'bg-primary-600 text-white hover:bg-primary-700': variant === 'default',
          'bg-dark-700 text-dark-100 hover:bg-dark-600': variant === 'secondary',
          'bg-red-600 text-white hover:bg-red-700': variant === 'destructive',
          'border border-dark-600 text-dark-300': variant === 'outline',
          'bg-green-600 text-white': variant === 'success',
          'bg-yellow-600 text-white': variant === 'warning',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
