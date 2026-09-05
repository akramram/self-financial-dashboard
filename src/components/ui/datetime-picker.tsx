import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const todayLocal = () => format(new Date(), "yyyy-MM-dd");
const nowLocal = () => format(new Date(), "HH:mm");

interface DateTimePickerProps {
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  time: string;
  onChange: (date: string, time: string) => void;
  className?: string;
}

export default function DateTimePicker({ date, time, onChange, className }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = date ? new Date(`${date}T12:00:00`) : undefined;
  const isToday = date === todayLocal();

  const handleSelect = (d: Date | undefined) => {
    if (d) onChange(format(d, "yyyy-MM-dd"), time);
  };

  const label = date
    ? `${format(new Date(`${date}T12:00:00`), isToday ? "'Today'" : "MMM d")} · ${time}`
    : "Pick date";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-8 gap-1.5 px-2.5 text-xs font-normal",
            !isToday && "border-gold-400/50 text-gold-700 dark:text-gold-400",
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 opacity-60" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar mode="single" selected={selected} onSelect={handleSelect} />
        <div className="flex items-center justify-between gap-2 border-t border-border p-2">
          <input
            type="time"
            value={time}
            onChange={(e) => onChange(date, e.target.value || nowLocal())}
            aria-label="Time"
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onChange(todayLocal(), nowLocal())}
          >
            Now
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
