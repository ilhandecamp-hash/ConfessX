"use client";

import { AlertTriangle, Info, PartyPopper, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Announcement } from "@/types/post";
import { renderRichText } from "@/lib/markdown";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "confessx_dismissed_announcements";

function readDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

function dismiss(id: string) {
  try {
    const arr = readDismissed();
    if (!arr.includes(id)) arr.push(id);
    const val = JSON.stringify(arr.slice(-100));
    localStorage.setItem(DISMISSED_KEY, val);
    // Notifie les autres composants (NotificationsBell)
    window.dispatchEvent(new StorageEvent("storage", { key: DISMISSED_KEY, newValue: val }));
  } catch {
    /* ignore */
  }
}

const STYLES: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  info:    { bg: "bg-brand/10",           border: "border-brand/30",        text: "text-brand",        icon: <Info className="h-4 w-4" /> },
  update:  { bg: "bg-accent-funny/10",    border: "border-accent-funny/30", text: "text-accent-funny", icon: <Sparkles className="h-4 w-4" /> },
  warning: { bg: "bg-red-500/10",         border: "border-red-500/30",      text: "text-red-400",      icon: <AlertTriangle className="h-4 w-4" /> },
  event:   { bg: "bg-accent-yes/10",      border: "border-accent-yes/30",   text: "text-accent-yes",   icon: <PartyPopper className="h-4 w-4" /> },
};

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(new Set(readDismissed()));
    (async () => {
      try {
        const res = await fetch("/api/announcements", { cache: "no-store" });
        if (!res.ok) return;
        const { announcements } = await res.json();
        setItems(announcements as Announcement[]);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const visible = items.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  function handleDismiss(id: string) {
    dismiss(id);
    setDismissed((prev) => new Set(prev).add(id));
  }

  return (
    <div className="space-y-2">
      {visible.map((a) => {
        const style = STYLES[a.type] || STYLES.info;
        return (
          <div
            key={a.id}
            className={cn(
              "animate-slide-down rounded-2xl border p-4",
              style.bg,
              style.border,
            )}
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className={cn("flex items-center gap-2 text-sm font-bold", style.text)}>
                {style.icon}
                <span>{a.title}</span>
              </div>
              {a.dismissible && (
                <button
                  onClick={() => handleDismiss(a.id)}
                  className={cn("-m-1 rounded-full p-1 transition hover:bg-black/10", style.text)}
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-200">
              {renderRichText(a.body)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
