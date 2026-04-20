"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "confessx_dismissed_announcements";

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

// Bell visible pour tous les users (connectés ou pas), car les annonces sont publiques.
// Pour un user non loggé : seulement les annonces. Pour loggé : notifs + annonces.
export function NotificationsBell() {
  const { userId, ready } = useAuth();
  const [count, setCount] = useState(0);
  const [shake, setShake] = useState(false);
  const prevRef = useRef(0);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        if (!res.ok) return;
        const { unread, announcement_ids } = (await res.json()) as {
          unread: number;
          announcement_ids: string[];
        };
        if (cancelled) return;
        const dismissed = readDismissed();
        const visibleAnnouncements = (announcement_ids || []).filter(
          (id) => !dismissed.has(id),
        ).length;
        const total = (unread || 0) + visibleAnnouncements;
        setCount(total);

        if (total > prevRef.current && prevRef.current !== 0) {
          setShake(true);
          setTimeout(() => setShake(false), 800);
        }
        prevRef.current = total;
      } catch {
        /* ignore */
      }
    }
    void tick();
    const interval = setInterval(tick, 60_000);
    // Re-sync quand l'utilisateur dismisses une annonce (localStorage change)
    const onStorage = (e: StorageEvent) => {
      if (e.key === DISMISSED_KEY) void tick();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId, ready]);

  return (
    <Link
      href="/notifications"
      className="relative grid h-9 w-9 place-items-center rounded-full text-neutral-400 transition hover:bg-bg-soft hover:text-neutral-100"
      aria-label={`Notifications (${count} non lues)`}
    >
      <Bell className={cn("h-4 w-4", shake && "origin-top animate-wiggle")} />
      {count > 0 && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white",
            shake && "animate-pop",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
