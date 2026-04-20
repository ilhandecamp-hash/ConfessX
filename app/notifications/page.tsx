"use client";

import Link from "next/link";
import { ArrowLeft, Bell, Check, MessageCircle, Reply, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { formatRelative, cn } from "@/lib/utils";
import type { NotificationItem } from "@/types/post";
import { useAuth } from "@/contexts/AuthContext";

export default function NotificationsPage() {
  const { userId } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const { items } = await res.json();
      setItems(items as NotificationItem[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at || new Date().toISOString() })));
  }

  if (!userId) {
    return (
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-8 text-center">
          <Bell className="mx-auto mb-2 h-8 w-8 text-neutral-600" />
          <p className="text-sm text-neutral-400">Connecte-toi pour voir tes notifications.</p>
          <Link
            href="/auth/login"
            className="mt-3 inline-block rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-white"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

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

      {loading ? (
        <p className="py-6 text-center text-sm text-neutral-500">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-8 text-center">
          <p className="text-4xl">🔕</p>
          <p className="mt-2 text-sm text-neutral-400">Aucune notification pour l'instant.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <NotifCard key={n.id} n={n} />
          ))}
        </div>
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
