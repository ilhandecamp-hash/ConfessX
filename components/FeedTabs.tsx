"use client";

import { Flame, Clock } from "lucide-react";
import type { FeedTab } from "@/types/post";
import { cn } from "@/lib/utils";

interface Props {
  tab: FeedTab;
  onChange: (t: FeedTab) => void;
}

export function FeedTabs({ tab, onChange }: Props) {
  return (
    <div className="sticky top-14 z-10 -mx-4 border-b border-border bg-bg/95 px-4 py-2 backdrop-blur-md">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-bg-soft p-1">
        <TabBtn
          active={tab === "trending"}
          onClick={() => onChange("trending")}
          icon={<Flame className="h-4 w-4" />}
          label="Tendances"
        />
        <TabBtn
          active={tab === "recent"}
          onClick={() => onChange("recent")}
          icon={<Clock className="h-4 w-4" />}
          label="Récents"
        />
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition",
        active ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-neutral-400 hover:text-neutral-100",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
