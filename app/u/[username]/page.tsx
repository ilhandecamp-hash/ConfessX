import Link from "next/link";
import { ArrowLeft, Eye, MessageCircle, ThumbsUp } from "lucide-react";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { FollowButton, BlockButton } from "@/components/FollowButton";
import { createAnonServerClient } from "@/lib/supabase/server";
import { compactNumber } from "@/lib/utils";
import type { Post, Profile } from "@/types/post";

export const dynamic = "force-dynamic";

interface Props {
  params: { username: string };
}

export async function generateMetadata({ params }: Props) {
  return {
    title: `@${params.username} — ConfessX`,
    description: `Profil public de @${params.username}`,
  };
}

export default async function UserProfilePage({ params }: Props) {
  const supabase = createAnonServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username.toLowerCase())
    .maybeSingle();

  if (!profile) notFound();
  const p = profile as Profile;

  // Count followers/following
  const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("followed_id", p.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", p.id),
  ]);

  const { data: posts } = await supabase
    .from("posts")
    .select("*, author:profiles(id,username,first_name,last_name,avatar_seed,bio,created_at)")
    .eq("user_id", p.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);

  const list = (posts ?? []) as unknown as Post[];

  const totalVotes = list.reduce(
    (s, post) =>
      s + post.funny_count + post.awkward_count + post.serious_count + post.yes_count + post.no_count,
    0,
  );
  const totalViews = list.reduce((s, post) => s + (post.view_count || 0), 0);
  const karmaScore = totalVotes * 10 + totalViews;

  return (
    <div className="space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <header className="space-y-3 rounded-2xl border border-border bg-bg-card p-4">
        {p.banned && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            ⛔ Ce compte a été banni{p.banned_reason ? ` — motif : ${p.banned_reason}` : ""}.
          </div>
        )}
        <div className="flex items-start gap-3">
          <Avatar seed={p.avatar_seed} size="lg" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-lg font-bold">
              {p.first_name} {p.last_name}
            </p>
            <p className="truncate text-xs text-neutral-500">@{p.username}</p>
            <Badge karma={karmaScore} />
            {p.bio && <p className="mt-1 text-sm text-neutral-300">{p.bio}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <FollowButton username={p.username} />
          <BlockButton username={p.username} />
        </div>
      </header>

      <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
        <MiniStat label="Karma" value={karmaScore} accent />
        <MiniStat label="Posts" value={list.length} />
        <MiniStat label="Abonnés" value={followersCount ?? 0} />
        <MiniStat label="Abonnements" value={followingCount ?? 0} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={<MessageCircle className="h-3 w-3" />} label="Posts" value={list.length} />
        <StatCard icon={<ThumbsUp className="h-3 w-3" />} label="Votes" value={totalVotes} />
        <StatCard icon={<Eye className="h-3 w-3" />} label="Vues" value={totalViews} />
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
        Confessions publiques
      </h2>

      {list.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">
          Aucune confession publique (l'utilisateur peut aussi poster en anonyme).
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
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
      <div className="text-lg font-extrabold tabular-nums">{compactNumber(value)}</div>
      <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-neutral-500">
        {icon}
        {label}
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-bg-soft px-2 py-1.5">
      <div className={`text-sm font-bold tabular-nums ${accent ? "text-brand" : "text-neutral-100"}`}>
        {compactNumber(value)}
      </div>
      <div className="text-[10px] text-neutral-500">{label}</div>
    </div>
  );
}
