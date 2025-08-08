import React, { useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DateStripProps {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  daysBefore?: number;
  daysAfter?: number;
  className?: string;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function DateStrip({
  selected,
  onSelect,
  daysBefore = 7,
  daysAfter = 60,
  className,
}: DateStripProps) {
  const today = startOfDay(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => {
    const arr: Date[] = [];
    const start = new Date(today);
    start.setDate(today.getDate() - daysBefore);
    for (let i = 0; i <= daysBefore + daysAfter; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [today, daysBefore, daysAfter]);

  const scrollByAmount = (dir: -1 | 1) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  const isSameDay = (a?: Date, b?: Date) => {
    if (!a || !b) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button variant="outline" size="icon" className="shrink-0" onClick={() => scrollByAmount(-1)} aria-label="Dias anteriores">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto scroll-px-2 px-1"
      >
        <div className="flex gap-2 w-max">
          {days.map((d) => {
            const selectedDay = isSameDay(selected, d);
            const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" });
            const dayNum = d.getDate();
            return (
              <button
                key={d.toDateString()}
                onClick={() => onSelect(new Date(d))}
                className={cn(
                  "rounded-md border px-2 py-2 w-14 h-16 flex flex-col items-center justify-center transition-colors",
                  selectedDay
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
                aria-label={`${dayNum} ${d.toLocaleDateString("pt-BR", { month: "long" })}`}
              >
                <span className="text-[10px] uppercase tracking-wide opacity-80">
                  {weekday}
                </span>
                <span className="text-base font-semibold leading-none">{dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>
      <Button variant="outline" size="icon" className="shrink-0" onClick={() => scrollByAmount(1)} aria-label="Próximos dias">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
