import * as React from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/base/popover";
import { Calendar } from "@/components/base/calendar";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  value: { start: string; end: string };
  onChange: (range: { start: string; end: string }) => void;
  className?: string;
}

// popup padding = p-4 (32px) + calendar padding = p-2 (16px) = 48px total
const PADDING = 48;
const MIN_CELL = 30; // px — minimum readable cell width
const MONTH_GAP = 16; // gap-4 between months
const TWO_MONTH_THRESHOLD = 14 * MIN_CELL + MONTH_GAP + PADDING; // ~494px trigger width

function getMonths(triggerWidth: number) {
  return triggerWidth >= TWO_MONTH_THRESHOLD ? 2 : 1;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [numberOfMonths, setNumberOfMonths] = React.useState(1);

  React.useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    const update = () => setNumberOfMonths(getMonths(el.offsetWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selected: DateRange | undefined = React.useMemo(() => {
    const from = value.start ? new Date(value.start + "T00:00:00") : undefined;
    const to = value.end ? new Date(value.end + "T00:00:00") : undefined;
    return from ? { from, to } : undefined;
  }, [value.start, value.end]);

  const handleSelect = (range: DateRange | undefined, selectedDay: Date) => {
    if ((selected?.from && selected?.to) || (selected?.from && !selected?.to && selectedDay < selected.from)) {
      onChange({ start: format(selectedDay, "yyyy-MM-dd"), end: "" });
      return;
    }
    onChange({
      start: range?.from ? format(range.from, "yyyy-MM-dd") : "",
      end: range?.to ? format(range.to, "yyyy-MM-dd") : "",
    });
  };

  const label = selected?.from
    ? selected.to
      ? `${format(selected.from, "MMM d")} – ${format(selected.to, "MMM d, yyyy")}`
      : format(selected.from, "MMM d, yyyy")
    : "Pick a date range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="w-full">
        <button
          ref={triggerRef}
          className={cn(
            "flex min-h-[44px] w-full items-center gap-2 rounded-xl border border-surface-border bg-surface-panel px-3 py-1.5 text-sm outline-none transition-all",
            "focus:border-brand focus:ring-4 focus:ring-brand-soft",
            !selected?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-60" />
          <span className="truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-4"
        align="center"
        style={{ width: 'var(--anchor-width)' }}
      >
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={numberOfMonths}
          disabled={{ before: new Date() }}
          className="[--cell-size:--spacing(18)] w-full"
          classNames={{
            root: "w-full",
            months: numberOfMonths === 2
              ? "relative flex flex-row gap-4"
              : "relative flex flex-col gap-4",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
