"use client";

import { EyeOff, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Menu "..." sur une carte post : masquer le post (user connecté seulement pour l'instant).
export function PostMenu({ postId, onHidden }: { postId: string; onHidden?: () => void }) {
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  if (!userId) return null;

  async function hide() {
    setBusy(true);
    try {
      const res = await fetch(`/api/hide/${postId}`, { method: "POST" });
      if (res.ok) onHidden?.();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-[11px] text-neutral-500 hover:text-neutral-100"
        aria-label="Plus"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 animate-slide-up rounded-xl border border-border bg-bg-card p-1 shadow-xl">
          <button
            onClick={hide}
            disabled={busy}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-neutral-300 transition hover:bg-bg-soft hover:text-neutral-100"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Masquer ce post
          </button>
        </div>
      )}
    </div>
  );
}
