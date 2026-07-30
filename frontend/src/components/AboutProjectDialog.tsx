import { Coffee, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './base/dialog';

export function AboutProjectDialog() {
  return (
    <Dialog>
      <DialogTrigger className="group relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-full border border-surface-border bg-surface-panel px-3.5 text-xs font-bold text-copy-strong shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[var(--shadow-action)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-12 bg-linear-to-r from-brand-soft to-transparent transition-transform duration-300 group-hover:translate-x-3"
        />
        <Sparkles className="relative size-3.5 text-brand" aria-hidden="true" />
        <span className="relative whitespace-nowrap">About this project</span>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto border border-surface-border bg-surface-panel p-0 shadow-[0_28px_90px_rgba(13,43,63,0.24)] backdrop-blur-2xl sm:max-w-[820px]">
        <div className="relative overflow-hidden px-5 py-8 sm:px-8">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-24 size-64 rounded-full bg-brand-bright/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute left-[62%] top-8 h-px w-40 -rotate-12 bg-linear-to-r from-brand/50 to-transparent"
          />
          <div
            aria-hidden="true"
            className="absolute right-[20%] top-[53px] size-2 rounded-full border-2 border-brand bg-surface-panel shadow-[0_0_0_5px_var(--brand-soft)]"
          />

          <DialogHeader className="relative grid gap-6 pr-8 md:grid-cols-[0.9fr_1.1fr] md:gap-x-9">
            <div>
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
                Built for flexible travelers
              </p>
              <DialogTitle className="mt-3 max-w-[360px] text-3xl font-bold leading-[1.08] tracking-[-0.035em] text-copy-strong sm:text-[36px]">
                Fewer tabs. More ways to get there.
              </DialogTitle>
            </div>

            <div className="space-y-3 md:pt-0.5">
              <DialogDescription className="text-[14px] leading-relaxed text-copy-muted sm:text-[15px]">
                We like to explore every viable route and date before booking a
                trip. When several airports and dates are in play, that can mean
                juggling dozens of tabs and side-by-side searches.
              </DialogDescription>
              <p className="m-0 text-[14px] leading-relaxed text-copy-muted sm:text-[15px]">
                Flight Search Engine brings those combinations into one place,
                making it easier to find an affordable itinerary that fits the
                trip. We hope it makes planning your next trip a little easier.
                Enjoy!
              </p>
              <p className="m-0 text-xs font-semibold text-copy-strong">
                — Owen Wild, Richard Kirsch &amp; Timothy Kugler
              </p>
            </div>
          </DialogHeader>
        </div>

        <div className="flex flex-col gap-4 border-t border-surface-border bg-brand-soft/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-panel text-brand shadow-sm">
              <Coffee className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="m-0 text-sm font-bold text-copy-strong">
                Help keep it flying
              </h3>
              <p className="mb-0 mt-1 text-xs leading-relaxed text-copy-muted">
                Like the project? Buy us a coffee and help keep it running.
              </p>
            </div>
          </div>
          <a
            href="https://buymeacoffee.com/multiflights"
            target="_blank"
            rel="noopener noreferrer"
            className="self-start whitespace-nowrap rounded-full border border-brand/25 bg-surface-panel px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-brand shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-[var(--shadow-action)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0 sm:self-center"
          >
            Buy us a coffee
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
