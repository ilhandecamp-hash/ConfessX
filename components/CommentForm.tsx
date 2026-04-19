"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { getOrCreateDeviceToken } from "@/lib/device";
import { MAX_COMMENT_LENGTH } from "@/types/post";
import { moderate } from "@/lib/moderation";
import { cn } from "@/lib/utils";

export function CommentForm({ postId, onPosted }: { postId: string; onPosted: () => void }) {
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
        body: JSON.stringify({ content: text, device_token: token }),
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
          placeholder="Donne ton avis anonymement…"
          rows={2}
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
          <button
            type="submit"
            disabled={busy || content.trim().length < 1}
            className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-hover disabled:opacity-40"
          >
            <Send className="h-3 w-3" />
            {busy ? "…" : "Publier"}
          </button>
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </form>
  );
}
