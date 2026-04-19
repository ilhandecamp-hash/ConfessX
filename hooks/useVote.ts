"use client";

import { useCallback, useState } from "react";
import type { VoteType } from "@/types/post";

const STORAGE_KEY = "confessx_votes";

type VoteMap = Record<string, VoteType[]>;

function readMap(): VoteMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeMap(m: VoteMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

export function hasVoted(postId: string, type: VoteType): boolean {
  const m = readMap();
  return (m[postId] || []).includes(type);
}

export function useVote(postId: string, initialCounts: Record<VoteType, number>) {
  const [counts, setCounts] = useState(initialCounts);
  const [pending, setPending] = useState<VoteType | null>(null);
  const [votedTypes, setVotedTypes] = useState<VoteType[]>(() =>
    typeof window === "undefined" ? [] : readMap()[postId] || [],
  );

  const castVote = useCallback(
    async (type: VoteType) => {
      if (votedTypes.includes(type) || pending) return;

      setPending(type);
      setCounts((c) => ({ ...c, [type]: c[type] + 1 }));
      setVotedTypes((v) => {
        const next = [...v, type];
        const m = readMap();
        m[postId] = next;
        writeMap(m);
        return next;
      });

      try {
        const res = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, type }),
        });
        if (!res.ok) throw new Error("vote_failed");
      } catch {
        // rollback
        setCounts((c) => ({ ...c, [type]: Math.max(0, c[type] - 1) }));
        setVotedTypes((v) => {
          const next = v.filter((t) => t !== type);
          const m = readMap();
          m[postId] = next;
          writeMap(m);
          return next;
        });
      } finally {
        setPending(null);
      }
    },
    [postId, pending, votedTypes],
  );

  return { counts, castVote, pending, votedTypes };
}
