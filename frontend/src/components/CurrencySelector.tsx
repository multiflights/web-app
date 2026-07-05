import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './base/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './base/command';
import { useCurrency } from '../hooks/useCurrency';
import { cn } from '@/lib/utils';

// Symbols and names are pinned to English: the site is English-only, so the
// list must not switch language with the browser locale. The 'symbol' display
// keeps dollar-family currencies distinguishable (MX$, CA$, A$).
function currencySymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
    }).formatToParts(0);
    return parts.find(part => part.type === 'currency')?.value ?? code;
  } catch {
    return code;
  }
}

function currencyName(code: string): string {
  try {
    return new Intl.DisplayNames('en', { type: 'currency' }).of(code) ?? code;
  } catch {
    return code;
  }
}

const triggerClasses =
  'inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-field ' +
  'px-3 py-1.5 text-xs font-bold text-copy-strong transition-colors hover:bg-brand-soft ' +
  'disabled:pointer-events-none disabled:opacity-60';

export function CurrencySelector() {
  const { currency, setCurrency, rates, availableCurrencies } = useCurrency();
  const [open, setOpen] = useState(false);

  if (!rates) {
    return (
      <button
        type="button"
        className={triggerClasses}
        disabled
        title="Live exchange rates unavailable — prices shown in USD"
      >
        $ USD
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={triggerClasses} aria-label="Change currency">
        <span>{currencySymbol(currency)}</span>
        <span>{currency}</span>
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <Command>
          <CommandInput placeholder="Search currency…" />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            {availableCurrencies.map(code => (
              <CommandItem
                key={code}
                value={`${code} ${currencyName(code)}`}
                data-checked={code === currency}
                onSelect={() => {
                  setCurrency(code);
                  setOpen(false);
                }}
              >
                <span className="font-semibold">{code}</span>
                <span className="truncate text-muted-foreground">{currencyName(code)}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
