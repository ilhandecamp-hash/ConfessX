"use client";

import { Check, X } from "lucide-react";
import { useVote } from "@/hooks/useVote";
import type { Post } from "@/types/post";
import { cn, compactNumber } from "@/lib/utils";

export function JudgmentBar({ post }: { post: Post }) {
  const { counts, castVote, pending, votedTypes } = useVote(post.id, {
    funny: post.funny_count,
    awkward: post.awkward_count,
    serious: post.serious_count,
    yes: post.yes_count,
    no: post.no_count,
  });

  const total = counts.yes + counts.no;
  const yesPct = total === 0 ? 50 : Math.round((counts.yes / total) * 100);
  const noPct = 100 - yesPct;
  const hasVoted = votedTypes.includes("yes") || votedTypes.includes("no");

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => castVote("yes")}
          disabled={hasVoted || pending === "yes"}
          className={cn(
            "group flex items-center justify-center gap-2 rounded-xl border border-border bg-bg-soft py-3 transition active:scale-95",
            "hover:border-accent-yes/60 hover:bg-accent-yes/10 hover:text-accent-yes",
            votedTypes.includes("yes") && "border-accent-yes bg-accent-yes/15 text-accent-yes",
            hasVoted && "cursor-default",
          )}
        >
          <Check className={cn("h-4 w-4", pending === "yes" && "animate-bounce-in")} />
          <span className="text-sm font-semibold">Oui, en tort</span>
          <span className="ml-1 text-sm font-bold tabular-nums text-neutral-400 group-hover:text-inherit">
            {compactNumber(counts.yes)}
          </span>
        </button>

        <button
          onClick={() => castVote("no")}
          disabled={hasVoted || pending === "no"}
          className={cn(
            "group flex items-center justify-center gap-2 rounded-xl border border-border bg-bg-soft py-3 transition active:scale-95",
            "hover:border-accent-no/60 hover:bg-accent-no/10 hover:text-accent-no",
            votedTypes.includes("no") && "border-accent-no bg-accent-no/15 text-accent-no",
            hasVoted && "cursor-default",
          )}
        >
          <X className={cn("h-4 w-4", pending === "no" && "animate-bounce-in")} />
          <span className="text-sm font-semibold">Non, OK</span>
          <span className="ml-1 text-sm font-bold tabular-nums text-neutral-400 group-hover:text-inherit">
            {compactNumber(counts.no)}
          </span>
        </button>
      </div>

      {hasVoted && total > 0 && (
        <div className="animate-slide-up space-y-1">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-bg-soft">
            <div className="bg-accent-yes transition-all" style={{ width: `${yesPct}%` }} />
            <div className="bg-accent-no transition-all" style={{ width: `${noPct}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500">
            <span>{yesPct}% en tort</span>
            <span>{total} votes</span>
            <span>{noPct}% OK</span>
          </div>
        </div>
      )}
    </div>
  );
}
