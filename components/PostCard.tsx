"use client";

import Link from "next/link";
import { Eye, MessageCircle, Scale } from "lucide-react";
import { useState } from "react";
import { CATEGORIES, type Post } from "@/types/post";
import { cn, compactNumber, formatRelative } from "@/lib/utils";
import { renderRichText } from "@/lib/markdown";
import { VoteBar } from "./VoteBar";
import { JudgmentBar } from "./JudgmentBar";
import { ReportButton } from "./ReportButton";
import { ShareButton } from "./ShareButton";
import { BookmarkButton } from "./BookmarkButton";
import { OwnerActions } from "./OwnerActions";
import { AuthorBadge } from "./AuthorBadge";
import { NsfwGate } from "./NsfwGate";
import { PostMenu } from "./PostMenu";

interface Props {
  post: Post;
  highlight?: boolean;
  linkToDetail?: boolean;
}

export function PostCard({ post: initial, highlight = false, linkToDetail = true }: Props) {
  const [post, setPost] = useState<Post>(initial);
  const [deleted, setDeleted] = useState(false);
  const [hidden, setHidden] = useState(false);

  const cat = CATEGORIES.find((c) => c.id === post.category);
  const isJudgment = post.mode === "judgment";

  if (deleted) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-bg-card p-4 text-center text-xs text-neutral-500">
        Post supprimé.
      </div>
    );
  }

  if (hidden) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-bg-card p-3 text-center text-xs text-neutral-500">
        Post masqué.{" "}
        <button onClick={() => setHidden(false)} className="underline hover:text-neutral-300">
          Rétablir
        </button>
      </div>
    );
  }

  const body = (
    <p className="mb-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-neutral-100">
      {renderRichText(post.content)}
    </p>
  );

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
          <AuthorBadge author={post.author} fallbackSeed={post.id} />
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
          {post.nsfw && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400">
              NSFW
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
      {post.nsfw ? (
        <NsfwGate>
          {linkToDetail ? (
            <Link href={`/post/${post.id}`} className="block">
              {body}
            </Link>
          ) : (
            body
          )}
        </NsfwGate>
      ) : linkToDetail ? (
        <Link href={`/post/${post.id}`} className="block">
          {body}
        </Link>
      ) : (
        body
      )}

      {isJudgment ? <JudgmentBar post={post} /> : <VoteBar post={post} />}

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-[11px] text-neutral-600">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {compactNumber(post.view_count || 0)}
          </span>
          {linkToDetail && (
            <Link
              href={`/post/${post.id}#comments`}
              className="flex items-center gap-1 transition hover:text-neutral-100"
            >
              <MessageCircle className="h-3 w-3" />
              Commenter
            </Link>
          )}
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
          <PostMenu postId={post.id} onHidden={() => setHidden(true)} />
        </div>
      </footer>
    </article>
  );
}
