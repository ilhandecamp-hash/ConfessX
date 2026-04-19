"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton({ postId }: { postId: string }) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/post/${postId}`
        : `/post/${postId}`;

    // 1) Web Share API
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "ConfessX", url });
        return;
      } catch {
        /* fallback */
      }
    }
    // 2) Clipboard fallback
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[11px] text-neutral-500 transition hover:text-neutral-100"
      aria-label="Partager"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "Copié !" : "Partager"}
    </button>
  );
}
