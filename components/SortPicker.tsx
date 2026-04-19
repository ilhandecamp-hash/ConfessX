"use client";

import type { TimeRange } from "@/types/post";
import { cn } from "@/lib/utils";

interface Props {
  value: TimeRange;
  onChange: (r: TimeRange) => void;
}

const OPTIONS: { id: TimeRange; label: string }[] = [
  { id: "day",  label: "24h" },
  { id: "week", label: "Semaine" },
  { id: "all",  label: "Tout" },
];

export function SortPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 text-[11px]">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-full px-2.5 py-1 font-semibold transition",
            value === o.id
              ? "bg-brand/15 text-brand"
              : "text-neutral-500 hover:text-neutral-100",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
