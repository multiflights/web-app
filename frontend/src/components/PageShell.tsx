import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="relative z-1 max-w-[1100px] mx-auto px-4 py-7 pb-12">
      <h1 className="m-0 mb-3.5 text-xl md:text-[26px] tracking-tight font-bold text-copy-strong">
        Flight Tracker
      </h1>
      {children}
    </div>
  );
}
