import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/PostCard";
import { Comments } from "@/components/Comments";
import { ViewTracker } from "@/components/ViewTracker";
import { createAnonServerClient } from "@/lib/supabase/server";
import type { Post } from "@/types/post";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  const supabase = createAnonServerClient();
  const { data } = await supabase
    .from("posts")
    .select("content")
    .eq("id", params.id)
    .eq("status", "published")
    .maybeSingle();
  const excerpt = data?.content?.slice(0, 120);
  return {
    title: excerpt ? `${excerpt}… — ConfessX` : "Confession — ConfessX",
    description: excerpt,
  };
}

export default async function PostDetailPage({ params }: Props) {
  const supabase = createAnonServerClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("id", params.id)
    .eq("status", "published")
    .maybeSingle();

  if (!data) notFound();
  const post = data as Post;

  return (
    <div className="space-y-4">
      <ViewTracker postId={post.id} />
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au feed
      </Link>
      <PostCard post={post} linkToDetail={false} />
      <Comments postId={post.id} />
    </div>
  );
}
