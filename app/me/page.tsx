"use client";

import Link from "next/link";
import { ArrowLeft, Eye, MessageCircle, RefreshCw, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { FeedSkeleton } from "@/components/Skeleton";
import { getOrCreateDeviceToken, resetDeviceToken } from "@/lib/device";
import { compactNumber } from "@/lib/utils";
import { useOwnership } from "@/contexts/OwnershipContext";
import type { Post } from "@/types/post";

export default function MePage() {
  const { refresh: refreshOwnership } = useOwnership();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const token = getOrCreateDeviceToken();
      const res = await fetch("/api/posts/mine", {
        headers: { "x-device-token": token },
        cache: "no-store",
      });
      if (!res.ok) return;
      const { posts } = await res.json();
      setPosts(posts as Post[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function onReset() {
    if (!confirm("Réinitialiser ton identifiant anonyme ? Tu perdras l'accès à tes posts existants.")) return;
    resetDeviceToken();
    setPosts([]);
    void refreshOwnership();
  }

  const totalVotes = posts.reduce(
    (s, p) =>
      s + p.funny_count + p.awkward_count + p.serious_count + p.yes_count + p.no_count,
    0,
  );
  const totalViews = posts.reduce((s, p) => s + (p.view_count || 0), 0);
  const karmaScore = totalVotes * 10 + totalViews;

  return (
    <div className="space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      {/* Karma banner */}
      <div className="overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/20 via-bg-card to-bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">Karma</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums text-neutral-100">
              {compactNumber(karmaScore)}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-500">Score anonyme global</p>
          </div>
          <ThumbsUp className="h-10 w-10 text-brand/40" />
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<MessageCircle className="h-3 w-3" />} label="Posts" value={posts.length} />
        <Stat icon={<ThumbsUp className="h-3 w-3" />} label="Votes" value={totalVotes} />
        <Stat icon={<Eye className="h-3 w-3" />} label="Vues" value={totalViews} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Mes confessions</h2>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-[11px] text-neutral-500 transition hover:text-red-400"
          title="Réinitialiser mon ID anonyme"
        >
          <RefreshCw className="h-3 w-3" />
          Reset ID
        </button>
      </div>

      {loading ? (
        <FeedSkeleton count={2} />
      ) : posts.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-dashed border-border bg-bg-card p-8 text-center">
          <p className="text-4xl">👻</p>
          <p className="text-sm text-neutral-400">Tu n'as encore rien publié.</p>
          <Link
            href="/new"
            className="mt-2 inline-block rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-white"
          >
            Balancer une confession
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-3 text-center">
      <div className="text-xl font-extrabold tabular-nums">{compactNumber(value)}</div>
      <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-neutral-500">
        {icon}
        {label}
      </div>
    </div>
  );
}
