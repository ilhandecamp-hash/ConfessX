"use client";

import { useVote } from "@/hooks/useVote";
import type { Post, VoteType } from "@/types/post";
import { cn, compactNumber } from "@/lib/utils";

const BUTTONS: { type: VoteType; emoji: string; label: string; accent: string }[] = [
  { type: "funny",   emoji: "😂", label: "Drôle",  accent: "hover:bg-accent-funny/15 hover:text-accent-funny" },
  { type: "awkward", emoji: "😳", label: "Gênant", accent: "hover:bg-accent-awkward/15 hover:text-accent-awkward" },
  { type: "serious", emoji: "💀", label: "Grave",  accent: "hover:bg-accent-serious/15 hover:text-accent-serious" },
];

export function VoteBar({ post }: { post: Post }) {
  const { counts, castVote, pending, votedTypes } = useVote(post.id, {
    funny: post.funny_count,
    awkward: post.awkward_count,
    serious: post.serious_count,
    yes: post.yes_count,
    no: post.no_count,
  });

  return (
    <div className="grid grid-cols-3 gap-2">
      {BUTTONS.map(({ type, emoji, label, accent }) => {
        const voted = votedTypes.includes(type);
        const isPending = pending === type;
        return (
          <button
            key={type}
            onClick={() => castVote(type)}
            disabled={voted || isPending}
            className={cn(
              "group flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-bg-soft py-2.5 px-2 transition active:scale-95",
              accent,
              voted && "border-brand/60 bg-brand/10 text-brand",
              (voted || isPending) && "cursor-default",
            )}
            aria-label={`${label}: ${counts[type]} votes`}
          >
            <span className={cn("text-xl leading-none", isPending && "animate-bounce-in")}>{emoji}</span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 group-hover:text-inherit">
              {label}
            </span>
            <span className="text-sm font-bold tabular-nums">{compactNumber(counts[type])}</span>
          </button>
        );
      })}
    </div>
  );
}
