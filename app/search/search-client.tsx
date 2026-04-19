"use client";

import Link from "next/link";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PostCard } from "@/components/PostCard";
import { SearchBar } from "@/components/SearchBar";
import type { Post } from "@/types/post";

export function SearchClient() {
  const params = useSearchParams();
  const q = (params.get("q") || "").trim();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q || q.length < 2) {
      setPosts([]);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const { posts } = await res.json();
        setPosts(posts as Post[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [q]);

  return (
    <div className="space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <SearchBar initial={q} />

      {q.length < 2 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-8 text-center">
          <SearchIcon className="mx-auto mb-2 h-8 w-8 text-neutral-600" />
          <p className="text-sm text-neutral-400">Tape au moins 2 caractères pour chercher.</p>
        </div>
      ) : loading ? (
        <p className="py-6 text-center text-sm text-neutral-500">Recherche…</p>
      ) : posts.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          Aucun résultat pour « {q} ».
        </p>
      ) : (
        <>
          <p className="text-xs text-neutral-500">
            {posts.length} résultat{posts.length > 1 ? "s" : ""} pour « {q} »
          </p>
          <div className="space-y-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
