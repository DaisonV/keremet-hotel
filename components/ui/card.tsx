import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

export const Card = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] sm:rounded-3xl sm:p-4 dark:border-white/[0.055] dark:bg-white/[0.04] dark:shadow-none', className)} {...props}>
        {children}
    </div>
);

export const CardHeader = ({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) => (
    <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <div className="min-w-0">
            {subtitle && <p className="text-[11px] uppercase tracking-widest text-slate-600 dark:text-white/40">{subtitle}</p>}
            <h3 className="truncate text-base font-semibold text-light-text dark:text-white sm:text-lg">{title}</h3>
        </div>
        {actions}
    </div>
);
