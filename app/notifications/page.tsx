"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  Info,
  Megaphone,
  MessageCircle,
  PartyPopper,
  Reply,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { formatRelative, cn } from "@/lib/utils";
import { renderRichText } from "@/lib/markdown";
import type { Announcement, NotificationItem } from "@/types/post";
import { useAuth } from "@/contexts/AuthContext";

const DISMISSED_KEY = "confessx_dismissed_announcements";

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function writeDismissed(s: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...s].slice(-100)));
    window.dispatchEvent(
      new StorageEvent("storage", { key: DISMISSED_KEY, newValue: JSON.stringify([...s]) }),
    );
  } catch {
    /* ignore */
  }
}

export default function NotificationsPage() {
  const { userId } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems((data.items ?? []) as NotificationItem[]);
      setAnnouncements((data.announcements ?? []) as Announcement[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAllRead() {
    if (userId) {
      await fetch("/api/notifications", { method: "PATCH" });
      setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at || new Date().toISOString() })));
    }
    // Dismiss all announcements too
    const next = new Set(dismissed);
    for (const a of announcements) if (a.dismissible) next.add(a.id);
    writeDismissed(next);
    setDismissed(next);
  }

  function dismissAnnouncement(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    writeDismissed(next);
    setDismissed(next);
  }

  const visibleAnnouncements = announcements.filter((a) => !dismissed.has(a.id));
  const nothing = !loading && visibleAnnouncements.length === 0 && items.length === 0;

  return (
    <div className="space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Bell className="h-6 w-6 text-brand" />
          Notifications
        </h1>
        <button
          onClick={markAllRead}
          className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-neutral-400 hover:text-neutral-100"
        >
          <Check className="h-3 w-3" />
          Tout marquer lu
        </button>
      </div>

      {/* Annonces */}
      {visibleAnnouncements.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500">
            <Megaphone className="h-3.5 w-3.5" />
            Annonces
          </h2>
          <div className="space-y-2">
            {visibleAnnouncements.map((a) => (
              <AnnouncementRow
                key={a.id}
                announcement={a}
                onDismiss={() => dismissAnnouncement(a.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Notifications personnelles */}
      {userId && items.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Pour toi</h2>
          <div className="space-y-2">
            {items.map((n) => (
              <NotifCard key={n.id} n={n} />
            ))}
          </div>
        </section>
      )}

      {loading && (
        <p className="py-6 text-center text-sm text-neutral-500">Chargement…</p>
      )}

      {!loading && !userId && visibleAnnouncements.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-8 text-center">
          <Bell className="mx-auto mb-2 h-8 w-8 text-neutral-600" />
          <p className="text-sm text-neutral-400">Connecte-toi pour voir tes notifications perso.</p>
          <Link
            href="/auth/login"
            className="mt-3 inline-block rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-white"
          >
            Se connecter
          </Link>
        </div>
      )}

      {nothing && userId && (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-8 text-center">
          <p className="text-4xl">🔕</p>
          <p className="mt-2 text-sm text-neutral-400">Aucune notification pour l'instant.</p>
        </div>
      )}
    </div>
  );
}

function AnnouncementRow({
  announcement,
  onDismiss,
}: {
  announcement: Announcement;
  onDismiss: () => void;
}) {
  const icon =
    announcement.type === "warning" ? <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
    : announcement.type === "update" ? <Sparkles className="h-3.5 w-3.5 text-accent-funny" />
    : announcement.type === "event" ? <PartyPopper className="h-3.5 w-3.5 text-accent-yes" />
    : <Info className="h-3.5 w-3.5 text-brand" />;

  const border =
    announcement.type === "warning" ? "border-red-500/30"
    : announcement.type === "update" ? "border-accent-funny/30"
    : announcement.type === "event" ? "border-accent-yes/30"
    : "border-brand/30";

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3 bg-bg-card", border)}>
      <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5 text-sm font-bold text-neutral-100">
          {icon}
          <span>{announcement.title}</span>
        </div>
        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-neutral-300">
          {renderRichText(announcement.body)}
        </p>
        <p className="mt-1 text-[11px] text-neutral-600">
          {formatRelative(announcement.created_at)}
        </p>
      </div>
      {announcement.dismissible && (
        <button
          onClick={onDismiss}
          className="-m-1 rounded-full p-1 text-neutral-500 hover:bg-bg-soft hover:text-neutral-100"
          aria-label="Masquer cette annonce"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function NotifCard({ n }: { n: NotificationItem }) {
  const unread = !n.read_at;
  const href =
    n.type === "follow"
      ? n.actor_username
        ? `/u/${n.actor_username}`
        : "/notifications"
      : n.post_id
        ? `/post/${n.post_id}${n.comment_id ? "#comments" : ""}`
        : "/notifications";

  const icon =
    n.type === "reply" ? <Reply className="h-3.5 w-3.5 text-brand" />
    : n.type === "comment" ? <MessageCircle className="h-3.5 w-3.5 text-accent-yes" />
    : n.type === "follow" ? <UserPlus className="h-3.5 w-3.5 text-accent-funny" />
    : null;

  const label =
    n.type === "reply" ? "a répondu à ton commentaire"
    : n.type === "comment" ? "a commenté ton post"
    : n.type === "follow" ? "s'est abonné à toi"
    : "";

  const excerpt = n.comment_excerpt || n.post_excerpt;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 transition",
        unread ? "border-brand/30 bg-brand/5" : "border-border bg-bg-card hover:border-border-strong",
      )}
    >
      <Avatar seed={n.actor_avatar_seed || n.id} size="md" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm">
          {icon}
          <span className="font-semibold text-neutral-100">
            @{n.actor_username || "anonyme"}
          </span>
          <span className="text-neutral-400">{label}</span>
        </p>
        {excerpt && (
          <p className="mt-1 truncate text-xs text-neutral-500">« {excerpt} »</p>
        )}
        <p className="mt-0.5 text-[11px] text-neutral-600">{formatRelative(n.created_at)}</p>
      </div>
      {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
    </Link>
  );
}
