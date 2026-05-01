import { LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

export type StatusVariant = 'neutral' | 'error' | 'loading' | 'success';

export interface SearchStatus {
  variant: StatusVariant;
  message: string;
}

interface StatusMessageProps {
  status: SearchStatus;
}

const variantClasses: Record<StatusVariant, string> = {
  neutral: 'border-surface-border bg-surface-field text-copy-muted',
  error: 'border-red-200 bg-red-50 text-red-700',
  loading: 'border-brand/25 bg-brand-soft text-copy-strong',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export function StatusMessage({ status }: StatusMessageProps) {
  return (
    <div
      className={cn(
        'mt-2.5 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold',
        variantClasses[status.variant]
      )}
      role={status.variant === 'error' ? 'alert' : 'status'}
    >
      {status.variant === 'loading' && (
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
      )}
      <span>{status.message}</span>
    </div>
  );
}
