"use client";

import { EyeOff, Send, UserRound, X } from "lucide-react";
import { useState } from "react";
import { getOrCreateDeviceToken } from "@/lib/device";
import { MAX_COMMENT_LENGTH } from "@/types/post";
import { moderate } from "@/lib/moderation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  postId: string;
  onPosted: () => void;
  parentId?: string | null;
  autoFocus?: boolean;
  onCancel?: () => void;
  placeholder?: string;
}

export function CommentForm({
  postId,
  onPosted,
  parentId = null,
  autoFocus = false,
  onCancel,
  placeholder = "Donne ton avis…",
}: Props) {
  const { profile } = useAuth();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(!profile);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const text = content.trim();
    if (text.length < 1) return;

    const mod = moderate(text);
    if (!mod.ok) {
      setError(mod.reason || "Invalide.");
      return;
    }

    setBusy(true);
    try {
      const token = getOrCreateDeviceToken();
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          device_token: token,
          parent_id: parentId,
          anonymous,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur.");
        return;
      }
      setContent("");
      onPosted();
    } finally {
      setBusy(false);
    }
  }

  const remaining = MAX_COMMENT_LENGTH - content.length;

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="rounded-2xl border border-border bg-bg-card p-3 focus-within:border-brand">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
          placeholder={placeholder}
          rows={2}
          autoFocus={autoFocus}
          className="w-full resize-none bg-transparent text-sm leading-relaxed placeholder-neutral-600 focus:outline-none"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[11px] tabular-nums",
                remaining <= 40 ? "text-brand" : "text-neutral-600",
              )}
            >
              {remaining}
            </span>
            {profile && (
              <button
                type="button"
                onClick={() => setAnonymous((a) => !a)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition",
                  anonymous
                    ? "bg-bg-soft text-neutral-400"
                    : "bg-brand/15 text-brand",
                )}
                title={anonymous ? "Cliquer pour poster en tant que toi" : "Cliquer pour poster anonymement"}
              >
                {anonymous ? (
                  <>
                    <EyeOff className="h-3 w-3" />
                    Anonyme
                  </>
                ) : (
                  <>
                    <UserRound className="h-3 w-3" />@{profile.username}
                  </>
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-100"
              >
                <X className="h-3 w-3" />
                Annuler
              </button>
            )}
            <button
              type="submit"
              disabled={busy || content.trim().length < 1}
              className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-hover disabled:opacity-40"
            >
              <Send className="h-3 w-3" />
              {busy ? "…" : parentId ? "Répondre" : "Publier"}
            </button>
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
