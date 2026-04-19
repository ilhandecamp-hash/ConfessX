"use client";

import Link from "next/link";
import { ArrowLeft, MessageCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { getOrCreateDeviceToken, resetDeviceToken } from "@/lib/device";
import type { Post } from "@/types/post";

export default function MePage() {
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
  }

  const totalVotes = posts.reduce(
    (s, p) =>
      s +
      p.funny_count +
      p.awkward_count +
      p.serious_count +
      p.yes_count +
      p.no_count,
    0,
  );
  const totalViews = posts.reduce((s, p) => s + (p.view_count || 0), 0);

  return (
    <div className="space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Mon profil anonyme</h1>
        <p className="mt-1 text-xs text-neutral-500">
          Ton identité = ce navigateur. Aucun compte, aucun email, aucune trace sur un serveur.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Posts" value={posts.length} />
        <Stat label="Votes reçus" value={totalVotes} />
        <Stat label="Vues" value={totalViews} />
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
        <p className="py-6 text-center text-sm text-neutral-500">Chargement…</p>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-3 text-center">
      <div className="text-xl font-extrabold tabular-nums">{value}</div>
      <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-neutral-500">
        {label === "Posts" && <MessageCircle className="h-3 w-3" />}
        {label}
      </div>
    </div>
  );
}
