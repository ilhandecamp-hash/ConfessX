"use client";

import { Flame, Clock, Users } from "lucide-react";
import type { FeedTab } from "@/types/post";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  tab: FeedTab;
  onChange: (t: FeedTab) => void;
}

export function FeedTabs({ tab, onChange }: Props) {
  const { userId } = useAuth();

  return (
    <div className="sticky top-14 z-10 -mx-4 border-b border-border bg-bg/95 px-4 py-2 backdrop-blur-md">
      <div
        className={cn(
          "grid gap-1 rounded-xl bg-bg-soft p-1",
          userId ? "grid-cols-3" : "grid-cols-2",
        )}
      >
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
        {userId && (
          <TabBtn
            active={tab === "following"}
            onClick={() => onChange("following")}
            icon={<Users className="h-4 w-4" />}
            label="Abonnements"
          />
        )}
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
        "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition sm:text-sm",
        active ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-neutral-400 hover:text-neutral-100",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
