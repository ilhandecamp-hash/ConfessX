"use client";

import { MessageCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Comment } from "@/types/post";
import { CommentForm } from "./CommentForm";
import { CommentCard } from "./CommentCard";

export function Comments({ postId }: { postId: string }) {
  const [list, setList] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, { cache: "no-store" });
      if (!res.ok) return;
      const { comments } = await res.json();
      setList(comments as Comment[]);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mt-4 space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-400">
        <MessageCircle className="h-4 w-4" />
        Commentaires ({list.length})
      </h3>

      <CommentForm postId={postId} onPosted={load} />

      {loading ? (
        <p className="py-4 text-center text-xs text-neutral-500">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          Sois le premier à commenter.
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <CommentCard
              key={c.id}
              comment={c}
              onDeleted={(id) => setList((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}
    </section>
  );
}
