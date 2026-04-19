import Link from "next/link";
import { ArrowLeft, Eye, MessageCircle, ThumbsUp } from "lucide-react";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";
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
    description: `Profil public de @${params.username} sur ConfessX`,
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

      <header className="flex items-center gap-4 rounded-2xl border border-border bg-bg-card p-4">
        <Avatar seed={p.avatar_seed} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">
            {p.first_name} {p.last_name}
          </p>
          <p className="truncate text-xs text-neutral-500">@{p.username}</p>
          {p.bio && <p className="mt-1 text-sm text-neutral-300">{p.bio}</p>}
        </div>
      </header>

      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Karma" value={karmaScore} brand />
        <StatCard icon={<MessageCircle className="h-3 w-3" />} label="Posts" value={list.length} />
        <StatCard icon={<ThumbsUp className="h-3 w-3" />} label="Votes" value={totalVotes} />
        <StatCard icon={<Eye className="h-3 w-3" />} label="Vues" value={totalViews} />
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
        Confessions publiques
      </h2>

      {list.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">
          Cet utilisateur n'a pas encore publié sous son compte.
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
  brand,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
  brand?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 text-center ${
        brand ? "border-brand/30 bg-brand/10" : "border-border bg-bg-card"
      }`}
    >
      <div
        className={`text-lg font-extrabold tabular-nums ${brand ? "text-brand" : "text-neutral-100"}`}
      >
        {compactNumber(value)}
      </div>
      <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-neutral-500">
        {icon}
        {label}
      </div>
    </div>
  );
}
