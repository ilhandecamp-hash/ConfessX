"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedTab, Post, TimeRange, Category } from "@/types/post";
import { PostCard } from "./PostCard";
import { FeedTabs } from "./FeedTabs";
import { HighlightCard } from "./HighlightCard";
import { SortPicker } from "./SortPicker";
import { FeedSkeleton } from "./Skeleton";

const PAGE_SIZE = 15;

interface Props {
  initialPosts: Post[];
  highlight?: Post | null;
  forcedCategory?: Category;
  showTabs?: boolean;
  showRange?: boolean;
}

export function Feed({
  initialPosts,
  highlight = null,
  forcedCategory,
  showTabs = true,
  showRange = true,
}: Props) {
  const [tab, setTab] = useState<FeedTab>("trending");
  const [range, setRange] = useState<TimeRange>("all");
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialPosts.length < PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Reset quand filtre change
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setPosts([]);
    setPage(0);
    setDone(false);
    void loadMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, range, forcedCategory]);

  const loadMore = useCallback(
    async (reset = false) => {
      if ((loading || done) && !reset) return;
      setLoading(true);
      try {
        const next = reset ? 1 : page + 1;
        const params = new URLSearchParams({
          tab,
          range,
          page: String(next),
          limit: String(PAGE_SIZE),
        });
        if (forcedCategory) params.set("category", forcedCategory);
        const res = await fetch(`/api/posts?${params}`);
        if (!res.ok) throw new Error();
        const { posts: batch } = (await res.json()) as { posts: Post[] };
        setPosts((prev) => {
          const base = reset ? [] : prev;
          const seen = new Set(base.map((p) => p.id));
          return [...base, ...batch.filter((p) => !seen.has(p.id))];
        });
        setPage(next);
        if (batch.length < PAGE_SIZE) setDone(true);
      } catch {
        setDone(true);
      } finally {
        setLoading(false);
      }
    },
    [tab, range, page, loading, done, forcedCategory],
  );

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-4">
      {highlight && <HighlightCard post={highlight} />}

      {showTabs && (
        <div className="space-y-2">
          <FeedTabs tab={tab} onChange={setTab} />
          {showRange && tab === "trending" && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] text-neutral-600">Période :</span>
              <SortPicker value={range} onChange={setRange} />
            </div>
          )}
        </div>
      )}

      {posts.length === 0 && loading && <FeedSkeleton count={3} />}

      {posts.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-8 text-center">
          <p className="text-sm text-neutral-400">Aucune confession pour l'instant.</p>
          <p className="mt-1 text-xs text-neutral-600">Sois le premier à lâcher un secret.</p>
        </div>
      )}

      <div className="space-y-3">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-8" />

      {loading && posts.length > 0 && (
        <FeedSkeleton count={2} />
      )}
      {done && posts.length > 0 && (
        <div className="py-6 text-center text-xs text-neutral-600">— Fin du feed —</div>
      )}
    </div>
  );
}
