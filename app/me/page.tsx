"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  LogIn,
  MessageCircle,
  Pencil,
  RefreshCw,
  ThumbsUp,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { FeedSkeleton } from "@/components/Skeleton";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { getOrCreateDeviceToken, resetDeviceToken } from "@/lib/device";
import { compactNumber } from "@/lib/utils";
import { useOwnership } from "@/contexts/OwnershipContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Post } from "@/types/post";

export default function MePage() {
  const { refresh: refreshOwnership } = useOwnership();
  const { profile, signOut } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const token = getOrCreateDeviceToken();
      const res = await fetch("/api/posts/mine", {
        headers: { "x-device-token": token },
        cache: "no-store",
      });
      if (!res.ok) return;
      const { posts } = await res.json();
      setPosts(posts as Post[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function onReset() {
    if (!confirm("Réinitialiser ton identifiant anonyme ? Tu perdras l'accès à tes posts anonymes existants.")) return;
    resetDeviceToken();
    void load();
    void refreshOwnership();
  }

  const totalVotes = posts.reduce(
    (s, p) =>
      s + p.funny_count + p.awkward_count + p.serious_count + p.yes_count + p.no_count,
    0,
  );
  const totalViews = posts.reduce((s, p) => s + (p.view_count || 0), 0);
  const karmaScore = totalVotes * 10 + totalViews;

  const anonCount = posts.filter((p) => !p.user_id).length;
  const accountCount = posts.filter((p) => p.user_id).length;

  return (
    <div className="space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      {/* Account card */}
      {profile ? (
        <div className="space-y-3 rounded-2xl border border-border bg-bg-card p-4">
          <div className="flex items-start gap-3">
            <Avatar seed={profile.avatar_seed} size="lg" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-base font-bold">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="truncate text-xs text-neutral-500">@{profile.username}</p>
              {profile.bio && <p className="text-xs text-neutral-400">{profile.bio}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <Link
                href="/me/edit"
                className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-neutral-400 hover:border-border-strong"
              >
                <Pencil className="h-3 w-3" />
                Éditer
              </Link>
              <button
                onClick={signOut}
                className="rounded-full border border-border px-2 py-1 text-[11px] text-neutral-400 hover:text-red-400"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-dashed border-border bg-bg-card p-4">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-brand" />
            <p className="text-sm font-semibold">Tu postes en mode anonyme</p>
          </div>
          <p className="text-xs text-neutral-500">
            Crée un compte pour retrouver ton karma sur tous tes appareils et poster avec un pseudo.
          </p>
          <div className="flex gap-2">
            <Link
              href="/auth/signup"
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand py-2 text-xs font-bold text-white"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Créer un compte
            </Link>
            <Link
              href="/auth/login"
              className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border py-2 text-xs font-semibold text-neutral-300 hover:border-border-strong"
            >
              <LogIn className="h-3.5 w-3.5" />
              Se connecter
            </Link>
          </div>
        </div>
      )}

      {/* Karma + badge */}
      <div className="overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/20 via-bg-card to-bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">Karma</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums text-neutral-100">
              {compactNumber(karmaScore)}
            </p>
            <div className="mt-2">
              <Badge karma={karmaScore} showProgress />
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              {accountCount > 0 && anonCount > 0
                ? `Cumulé : ${accountCount} compte · ${anonCount} anonymes`
                : profile
                  ? "Posts de ton compte + posts anonymes de ce device"
                  : "Posts anonymes de ce device"}
            </p>
          </div>
          <ThumbsUp className="h-10 w-10 text-brand/40" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<MessageCircle className="h-3 w-3" />} label="Posts" value={posts.length} />
        <Stat icon={<ThumbsUp className="h-3 w-3" />} label="Votes" value={totalVotes} />
        <Stat icon={<Eye className="h-3 w-3" />} label="Vues" value={totalViews} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Mes confessions</h2>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-[11px] text-neutral-500 transition hover:text-red-400"
          title="Réinitialiser l'ID anonyme (ne touche pas au compte)"
        >
          <RefreshCw className="h-3 w-3" />
          Reset ID anonyme
        </button>
      </div>

      {loading ? (
        <FeedSkeleton count={2} />
      ) : posts.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-dashed border-border bg-bg-card p-8 text-center">
          <p className="text-4xl">👻</p>
          <p className="text-sm text-neutral-400">Tu n'as encore rien publié.</p>
          <Link
            href="/new"
            className="mt-2 inline-block rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-white"
          >
            Balancer une confession
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-3 text-center">
      <div className="text-xl font-extrabold tabular-nums">{compactNumber(value)}</div>
      <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-neutral-500">
        {icon}
        {label}
      </div>
    </div>
  );
}
