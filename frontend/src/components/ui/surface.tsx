import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';
import { Button } from './button';

export function PanelContainer({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'bg-surface-panel border border-surface-border rounded-[18px] shadow-[var(--shadow-panel)] backdrop-blur-[10px] p-3.5',
        className
      )}
      {...props}
    />
  );
}

export function FieldContainer({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'bg-surface-field border border-surface-border rounded-[14px] p-2.5',
        className
      )}
      {...props}
    />
  );
}

export function ResultCard({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'bg-surface-panel border border-surface-border rounded-xl shadow-sm transition-all',
        className
      )}
      {...props}
    />
  );
}

export function MutedMetadata({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('text-copy-muted text-xs', className)}
      {...props}
    />
  );
}

export function PrimaryActionButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        'rounded-[14px] font-black text-white bg-linear-to-br from-brand to-brand-bright shadow-[var(--shadow-action)] transition-all active:scale-[0.98]',
        className
      )}
      {...props}
    />
  );
}
