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

  const handleSelect = (range: DateRange | undefined, selectedDay: Date) => {
    // If a complete range exists, or clicked day is before current start → restart selection
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
      <PopoverTrigger>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-xl border border-surface-border bg-surface-panel px-3 py-1.5 text-sm outline-none transition-all",
            "focus:border-brand focus:ring-4 focus:ring-brand-soft",
            !selected?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-60" />
          <span className="truncate">{label}</span>
        </button>
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
