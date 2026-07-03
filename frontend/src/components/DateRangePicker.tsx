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

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selected: DateRange | undefined = React.useMemo(() => {
    const from = value.start ? new Date(value.start + "T00:00:00") : undefined;
    const to = value.end ? new Date(value.end + "T00:00:00") : undefined;
    return from ? { from, to } : undefined;
  }, [value.start, value.end]);

  const handleSelect = (_range: DateRange | undefined, selectedDay: Date) => {
    const from = selected?.from;
    const day = format(selectedDay, "yyyy-MM-dd");

    // Start a fresh single-day selection when there's no start yet, a complete
    // range already exists, or the clicked day is on/before the current start.
    // The on/before case keeps a re-clicked day single instead of "day – day".
    if (!from || selected?.to || selectedDay <= from) {
      onChange({ start: day, end: "" });
      return;
    }

    // A later day completes the range.
    onChange({ start: format(from, "yyyy-MM-dd"), end: day });
  };

  const label = selected?.from
    ? selected.to
      ? `${format(selected.from, "MMM d")} – ${format(selected.to, "MMM d, yyyy")}`
      : format(selected.from, "MMM d, yyyy")
    : "Pick a date range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border border-surface-border bg-surface-panel px-3 py-1.5 text-sm outline-none transition-all",
          "focus:border-brand focus:ring-4 focus:ring-brand-soft",
          !selected?.from && "text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="size-4 shrink-0 opacity-60" />
        <span className="truncate">{label}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="center">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={{ before: new Date() }}
          className="[--cell-size:--spacing(18)]"
        />
      </PopoverContent>
    </Popover>
  );
}
