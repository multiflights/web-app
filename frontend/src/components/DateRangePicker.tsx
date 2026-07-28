import * as React from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/base/popover";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/base/dialog";
import { Calendar } from "@/components/base/calendar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  value: { start: string; end: string };
  onChange: (range: { start: string; end: string }) => void;
  label?: string;
  placeholder?: string;
  minDate?: Date;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  label = "Date range",
  placeholder = "Pick a date range",
  minDate,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

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

  const displayLabel = selected?.from
    ? selected.to
      ? `${format(selected.from, "MMM d")} – ${format(selected.to, "MMM d, yyyy")}`
      : format(selected.from, "MMM d, yyyy")
    : placeholder;

  const triggerClassName = cn(
    "flex w-full items-center gap-2 rounded-xl border border-surface-border bg-surface-panel px-3 py-1.5 text-sm outline-none transition-all",
    "focus:border-brand focus:ring-4 focus:ring-brand-soft",
    !selected?.from && "text-muted-foreground",
    className
  );

  const triggerContent = (
    <>
      <CalendarIcon className="size-4 shrink-0 opacity-60" />
      <span className="truncate">{displayLabel}</span>
    </>
  );

  const calendar = (
    <Calendar
      mode="range"
      selected={selected}
      onSelect={handleSelect}
      numberOfMonths={isDesktop ? 2 : 1}
      showOutsideDays={false}
      disabled={{ before: minDate ?? new Date() }}
      className="[--cell-size:--spacing(9)]"
    />
  );

  // On mobile a popover anchored to the trigger can flip above the field and
  // overflow the top of the screen (hiding the month-nav arrows) when a month
  // needs a sixth week row. A viewport-centered dialog is immune to that.
  if (!isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger aria-label={label} className={triggerClassName}>{triggerContent}</DialogTrigger>
        <DialogContent className="flex w-fit max-w-[calc(100vw-1.5rem)] max-h-[90vh] items-center justify-center overflow-auto p-3">
          <DialogTitle className="sr-only">{label}</DialogTitle>
          {calendar}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label={label} className={triggerClassName}>{triggerContent}</PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-1rem)] p-4" align="center">
        {calendar}
      </PopoverContent>
    </Popover>
  );
}
