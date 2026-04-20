"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// Poll unread count every 60s. Cheap (single int4 RPC).
export function NotificationsBell() {
  const { userId } = useAuth();
  const [unread, setUnread] = useState(0);
  const [shake, setShake] = useState(false);
  const prevRef = useRef(0);

  useEffect(() => {
    if (!userId) {
      setUnread(0);
      prevRef.current = 0;
      return;
    }
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        if (!res.ok) return;
        const { unread: c } = await res.json();
        if (cancelled) return;
        const nb = c ?? 0;
        setUnread(nb);
        // Trigger shake when unread count increases (pas au 1er chargement)
        if (nb > prevRef.current && prevRef.current !== 0) {
          setShake(true);
          setTimeout(() => setShake(false), 800);
        }
        prevRef.current = nb;
      } catch {
        /* ignore */
      }
    }
    void tick();
    const interval = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId]);

  if (!userId) return null;

  return (
    <Link
      href="/notifications"
      className="relative grid h-9 w-9 place-items-center rounded-full text-neutral-400 transition hover:bg-bg-soft hover:text-neutral-100"
      aria-label={`Notifications (${unread} non lues)`}
    >
      <Bell className={cn("h-4 w-4", shake && "origin-top animate-wiggle")} />
      {unread > 0 && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white",
            shake && "animate-pop",
          )}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
