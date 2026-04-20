"use client";

import { Check, UserMinus, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function FollowButton({ username }: { username: string }) {
  const { userId, profile } = useAuth();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) {
      setFollowing(null);
      return;
    }
    (async () => {
      const res = await fetch(`/api/follows/${username}`, { cache: "no-store" });
      if (!res.ok) return;
      const { following } = await res.json();
      setFollowing(!!following);
    })();
  }, [userId, username]);

  // Pas de bouton pour soi-même
  if (profile?.username === username.toLowerCase()) return null;

  if (!userId) {
    return (
      <a
        href="/auth/login"
        className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:border-border-strong"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Se connecter pour suivre
      </a>
    );
  }

  async function toggle() {
    if (following === null || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/follows/${username}`, {
        method: following ? "DELETE" : "POST",
      });
      if (res.ok) setFollowing(!following);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy || following === null}
      className={cn(
        "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95",
        following
          ? "border border-border text-neutral-300 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
          : "bg-brand text-white hover:bg-brand-hover",
      )}
    >
      {following ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Abonné
        </>
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5" />
          Suivre
        </>
      )}
    </button>
  );
}

export function BlockButton({ username }: { username: string }) {
  const { userId, profile } = useAuth();
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const res = await fetch(`/api/blocks/${username}`, { cache: "no-store" });
      if (!res.ok) return;
      const { blocked } = await res.json();
      setBlocked(!!blocked);
    })();
  }, [userId, username]);

  if (!userId || profile?.username === username.toLowerCase()) return null;

  async function toggle() {
    if (busy) return;
    if (!blocked && !confirm(`Bloquer @${username} ? Tu ne verras plus ses posts / commentaires.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/blocks/${username}`, {
        method: blocked ? "DELETE" : "POST",
      });
      if (res.ok) setBlocked(!blocked);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        "flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        blocked
          ? "border-green-500/40 text-green-400 hover:bg-green-500/10"
          : "border-border text-neutral-400 hover:border-red-500/40 hover:text-red-400",
      )}
    >
      <UserMinus className="h-3.5 w-3.5" />
      {blocked ? "Débloquer" : "Bloquer"}
    </button>
  );
}
