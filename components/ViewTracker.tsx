"use client";

import { useEffect } from "react";

// Ping "fire & forget" pour incrémenter les vues du post.
// Rate-limited côté serveur (1 vue / device / post / 5min).
export function ViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/posts/${postId}/view`, { method: "POST", keepalive: true }).catch(() => {});
    }, 1500); // attends 1.5s pour filtrer les bots / rebonds
    return () => clearTimeout(t);
  }, [postId]);

  return null;
}
