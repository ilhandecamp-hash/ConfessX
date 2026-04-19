"use client";

import { Send, X } from "lucide-react";
import { useState } from "react";
import { getOrCreateDeviceToken } from "@/lib/device";
import { MAX_COMMENT_LENGTH } from "@/types/post";
import { moderate } from "@/lib/moderation";
import { cn } from "@/lib/utils";

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
  placeholder = "Donne ton avis anonymement…",
}: Props) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ content: text, device_token: token, parent_id: parentId }),
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
        <div className="flex items-center justify-between pt-1">
          <span
            className={cn(
              "text-[11px] tabular-nums",
              remaining <= 40 ? "text-brand" : "text-neutral-600",
            )}
          >
            {remaining}
          </span>
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
