import type { ReactNode } from 'react';
import { CurrencySelector } from './CurrencySelector';

interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="relative z-1 max-w-[1100px] mx-auto px-4 py-7 pb-12">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h1 className="m-0 text-[26px] tracking-tight font-bold text-copy-strong">
          Flight Tracker
        </h1>
        <CurrencySelector />
      </div>
      {children}
    </div>
  );
}
