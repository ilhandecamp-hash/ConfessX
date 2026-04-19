"use client";

import Link from "next/link";
import { ArrowLeft, Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { listBookmarks } from "@/lib/bookmarks";
import type { Post } from "@/types/post";

export default function BookmarksPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = listBookmarks();
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/posts?ids=${ids.join(",")}&limit=50`);
        if (!res.ok) return;
        const { posts: fetched } = await res.json();
        // Conserve l'ordre des bookmarks
        const order = new Map(ids.map((id, i) => [id, i]));
        const sorted = (fetched as Post[]).slice().sort(
          (a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999),
        );
        setPosts(sorted);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Bookmark className="h-6 w-6 text-brand" />
          Mes favoris
        </h1>
        <p className="mt-1 text-xs text-neutral-500">
          Sauvegardés localement sur ce navigateur.
        </p>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-neutral-500">Chargement…</p>
      ) : posts.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-dashed border-border bg-bg-card p-8 text-center">
          <p className="text-4xl">🔖</p>
          <p className="text-sm text-neutral-400">Aucun favori pour l'instant.</p>
          <p className="text-xs text-neutral-600">
            Clique sur « Sauver » sur une confession pour la retrouver ici.
          </p>
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
