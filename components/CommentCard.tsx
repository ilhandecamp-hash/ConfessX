"use client";

import { Reply, Trash2 } from "lucide-react";
import { useState } from "react";
import { peekDeviceToken } from "@/lib/device";
import { formatRelative, cn, compactNumber } from "@/lib/utils";
import { renderRichText } from "@/lib/markdown";
import type { Comment, CommentVoteType } from "@/types/post";
import { ReportButton } from "./ReportButton";
import { AuthorBadge } from "./AuthorBadge";
import { CommentForm } from "./CommentForm";

const STORAGE_KEY = "confessx_comment_votes";

function readMap(): Record<string, CommentVoteType[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeMap(m: Record<string, CommentVoteType[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

const BTNS: { type: CommentVoteType; emoji: string; title: string }[] = [
  { type: "funny",   emoji: "😂", title: "Drôle" },
  { type: "awkward", emoji: "😳", title: "Gênant" },
  { type: "serious", emoji: "💀", title: "Grave" },
];

interface Props {
  comment: Comment;
  postId: string;
  onDeleted: (id: string) => void;
  onReplyPosted: () => void;
  isReply?: boolean;
}

export function CommentCard({ comment, postId, onDeleted, onReplyPosted, isReply }: Props) {
  const [counts, setCounts] = useState({
    funny: comment.funny_count,
    awkward: comment.awkward_count,
    serious: comment.serious_count,
  });
  const [voted, setVoted] = useState<CommentVoteType[]>(() =>
    typeof window === "undefined" ? [] : readMap()[comment.id] || [],
  );
  const [replyOpen, setReplyOpen] = useState(false);

  async function onVote(type: CommentVoteType) {
    if (voted.includes(type)) return;
    setCounts((c) => ({ ...c, [type]: c[type] + 1 }));
    setVoted((v) => {
      const next = [...v, type];
      const m = readMap();
      m[comment.id] = next;
      writeMap(m);
      return next;
    });
    try {
      const res = await fetch(`/api/comments/${comment.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setCounts((c) => ({ ...c, [type]: Math.max(0, c[type] - 1) }));
      setVoted((v) => {
        const next = v.filter((t) => t !== type);
        const m = readMap();
        m[comment.id] = next;
        writeMap(m);
        return next;
      });
    }
  }

  async function onDelete() {
    const token = peekDeviceToken();
    if (!token) return;
    if (!confirm("Supprimer ce commentaire ?")) return;
    const res = await fetch(`/api/comments/${comment.id}`, {
      method: "DELETE",
      headers: { "x-device-token": token },
    });
    if (res.ok) onDeleted(comment.id);
  }

  return (
    <div className={cn("rounded-xl border border-border bg-bg-soft p-3", isReply && "bg-bg-card")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <AuthorBadge author={comment.author} fallbackSeed={comment.id} />
        <span className="text-[11px] text-neutral-500">
          {formatRelative(comment.created_at)}
          {comment.updated_at && " · modifié"}
        </span>
      </div>
      <p className="mb-2 whitespace-pre-wrap break-words pl-8 text-sm leading-relaxed text-neutral-100">
        {renderRichText(comment.content)}
      </p>
      <div className="flex items-center justify-between pl-8">
        <div className="flex items-center gap-1">
          {BTNS.map(({ type, emoji, title }) => {
            const isVoted = voted.includes(type);
            return (
              <button
                key={type}
                onClick={() => onVote(type)}
                disabled={isVoted}
                title={title}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-1 text-xs transition",
                  isVoted
                    ? "bg-brand/15 text-brand"
                    : "text-neutral-400 hover:bg-bg-card hover:text-neutral-100",
                )}
              >
                <span>{emoji}</span>
                <span className="tabular-nums">{compactNumber(counts[type])}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          {!isReply && (
            <button
              onClick={() => setReplyOpen((o) => !o)}
              className="flex items-center gap-1 text-[11px] text-neutral-500 transition hover:text-neutral-100"
            >
              <Reply className="h-3 w-3" />
              Répondre
            </button>
          )}
          <button
            onClick={onDelete}
            className="flex items-center gap-1 text-[11px] text-neutral-500 transition hover:text-red-400"
            title="Supprimer (auteur seulement)"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <ReportButton commentId={comment.id} compact />
        </div>
      </div>

      {replyOpen && !isReply && (
        <div className="mt-3 pl-8">
          <CommentForm
            postId={postId}
            parentId={comment.id}
            autoFocus
            onCancel={() => setReplyOpen(false)}
            placeholder="Répondre à ce commentaire…"
            onPosted={() => {
              setReplyOpen(false);
              onReplyPosted();
            }}
          />
        </div>
      )}
    </div>
  );
}
