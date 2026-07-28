import type { ReactNode } from 'react';
import { AboutProjectDialog } from './AboutProjectDialog';
import { CurrencySelector } from './CurrencySelector';

interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="relative z-1 max-w-[1100px] mx-auto px-4 py-7 pb-12">
      <header className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="m-0 text-[24px] leading-tight tracking-tight font-bold text-copy-strong sm:text-[26px]">
          Flight Search Engine
        </h1>

        <div className="flex items-center gap-2">
          <AboutProjectDialog />
          <CurrencySelector />
        </div>
      </header>
      {children}
    </div>
  );
}
