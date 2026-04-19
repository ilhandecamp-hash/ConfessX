"use client";

import Link from "next/link";
import { Eye, Scale } from "lucide-react";
import { useState } from "react";
import { CATEGORIES, type Post } from "@/types/post";
import { cn, compactNumber, formatRelative } from "@/lib/utils";
import { VoteBar } from "./VoteBar";
import { JudgmentBar } from "./JudgmentBar";
import { ReportButton } from "./ReportButton";
import { ShareButton } from "./ShareButton";
import { BookmarkButton } from "./BookmarkButton";
import { OwnerActions } from "./OwnerActions";

interface Props {
  post: Post;
  highlight?: boolean;
  linkToDetail?: boolean;
}

export function PostCard({ post: initial, highlight = false, linkToDetail = true }: Props) {
  const [post, setPost] = useState<Post>(initial);
  const [deleted, setDeleted] = useState(false);

  const cat = CATEGORIES.find((c) => c.id === post.category);
  const isJudgment = post.mode === "judgment";

  if (deleted) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-bg-card p-4 text-center text-xs text-neutral-500">
        Post supprimé.
      </div>
    );
  }

  return (
    <article
      className={cn(
        "relative rounded-2xl border border-border bg-bg-card p-4 transition",
        "hover:border-border-strong",
        highlight && "border-brand/40 bg-gradient-to-br from-brand/10 to-bg-card",
      )}
    >
      {/* Header */}
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={`/c/${post.category}`}
            className="flex items-center gap-1 rounded-full bg-bg-soft px-2 py-0.5 text-[11px] font-medium text-neutral-300 transition hover:bg-border"
          >
            <span>{cat?.emoji}</span>
            <span>{cat?.label}</span>
          </Link>
          {isJudgment && (
            <span className="flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand">
              <Scale className="h-3 w-3" />
              Jugement
            </span>
          )}
          {highlight && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Top du jour
            </span>
          )}
        </div>
        <span className="text-[11px] text-neutral-500">
          {formatRelative(post.created_at)}
          {post.updated_at ? " · modifié" : ""}
        </span>
      </header>

      {/* Content */}
      {linkToDetail ? (
        <Link href={`/post/${post.id}`} className="block">
          <p className="mb-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-neutral-100">
            {post.content}
          </p>
        </Link>
      ) : (
        <p className="mb-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-neutral-100">
          {post.content}
        </p>
      )}

      {/* Voting */}
      {isJudgment ? <JudgmentBar post={post} /> : <VoteBar post={post} />}

      {/* Footer */}
      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-neutral-600">
            <Eye className="h-3 w-3" />
            {compactNumber(post.view_count || 0)}
          </span>
          <OwnerActions
            post={post}
            onDeleted={() => setDeleted(true)}
            onEdited={(c) => setPost((p) => ({ ...p, content: c, updated_at: new Date().toISOString() }))}
          />
        </div>
        <div className="flex items-center gap-3">
          <BookmarkButton postId={post.id} />
          <ShareButton postId={post.id} />
          <ReportButton postId={post.id} />
        </div>
      </footer>
    </article>
  );
}
