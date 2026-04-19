"use client";

import { ChevronDown, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Comment, CommentSort } from "@/types/post";
import { CommentForm } from "./CommentForm";
import { CommentCard } from "./CommentCard";
import { CommentSkeleton } from "./Skeleton";
import { cn } from "@/lib/utils";

export function Comments({ postId }: { postId: string }) {
  const [list, setList] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<CommentSort>("new");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments?sort=${sort}`, { cache: "no-store" });
      if (!res.ok) return;
      const { comments } = await res.json();
      setList(comments as Comment[]);
    } finally {
      setLoading(false);
    }
  }, [postId, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  // Group comments: roots + replies indexed by parent
  const { roots, repliesByParent } = useMemo(() => {
    const roots: Comment[] = [];
    const map = new Map<string, Comment[]>();
    for (const c of list) {
      if (c.parent_id) {
        const arr = map.get(c.parent_id) || [];
        arr.push(c);
        map.set(c.parent_id, arr);
      } else {
        roots.push(c);
      }
    }
    // Replies toujours triées par date croissante
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return { roots, repliesByParent: map };
  }, [list]);

  function removeById(id: string) {
    setList((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
  }

  return (
    <section id="comments" className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-400">
          <MessageCircle className="h-4 w-4" />
          Commentaires ({list.length})
        </h3>
        <div className="flex gap-1 rounded-full bg-bg-soft p-0.5 text-[11px]">
          {(["new", "top"] as CommentSort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                "rounded-full px-2.5 py-1 font-semibold transition",
                sort === s ? "bg-brand text-white" : "text-neutral-400 hover:text-neutral-100",
              )}
            >
              {s === "new" ? "Récents" : "Top"}
            </button>
          ))}
        </div>
      </div>

      <CommentForm postId={postId} onPosted={load} />

      {loading ? (
        <div className="space-y-2">
          <CommentSkeleton />
          <CommentSkeleton />
          <CommentSkeleton />
        </div>
      ) : roots.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          Sois le premier à commenter.
        </p>
      ) : (
        <div className="space-y-2">
          {roots.map((c) => {
            const replies = repliesByParent.get(c.id) || [];
            return (
              <div key={c.id} className="space-y-2">
                <CommentCard
                  comment={c}
                  postId={postId}
                  onDeleted={removeById}
                  onReplyPosted={load}
                />
                {replies.length > 0 && (
                  <ThreadReplies
                    replies={replies}
                    postId={postId}
                    onDeleted={removeById}
                    onReplyPosted={load}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ThreadReplies({
  replies,
  postId,
  onDeleted,
  onReplyPosted,
}: {
  replies: Comment[];
  postId: string;
  onDeleted: (id: string) => void;
  onReplyPosted: () => void;
}) {
  const [open, setOpen] = useState(replies.length <= 2);
  return (
    <div className="ml-5 space-y-2 border-l-2 border-border pl-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-100"
        >
          <ChevronDown className="h-3 w-3" />
          Voir {replies.length} réponse{replies.length > 1 ? "s" : ""}
        </button>
      ) : (
        replies.map((r) => (
          <CommentCard
            key={r.id}
            comment={r}
            postId={postId}
            onDeleted={onDeleted}
            onReplyPosted={onReplyPosted}
            isReply
          />
        ))
      )}
    </div>
  );
}
