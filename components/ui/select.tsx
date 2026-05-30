'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
    <select
        ref={ref}
        className={cn(
            'h-10 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-light-text shadow-[0_6px_18px_-18px_rgba(15,23,42,0.32)] transition-[border-color,box-shadow,background-color] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 sm:h-11 sm:rounded-2xl sm:px-3.5 dark:border-white/[0.055] dark:bg-white/[0.05] dark:text-white dark:focus:border-white/15 dark:focus:bg-white/[0.08] dark:focus:ring-white/[0.06]',
            className
        )}
        {...props}
    >
        {children}
    </select>
));
Select.displayName = 'Select';
