"use client";

import { CATEGORIES, type Category } from "@/types/post";
import { cn } from "@/lib/utils";

interface Props {
  value: Category | null;
  onChange: (c: Category) => void;
}

export function CategoryPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {CATEGORIES.map((c) => {
        const active = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border border-border bg-bg-soft py-3 transition active:scale-95",
              active
                ? "border-brand bg-brand/15 text-brand"
                : "text-neutral-300 hover:border-border-strong",
            )}
          >
            <span className="text-xl leading-none">{c.emoji}</span>
            <span className="text-[11px] font-medium">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
