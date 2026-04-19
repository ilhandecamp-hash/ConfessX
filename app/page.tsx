import { Feed } from "@/components/Feed";
import { createAnonServerClient } from "@/lib/supabase/server";
import type { Post } from "@/types/post";

export const revalidate = 30; // ISR — le feed initial est régénéré toutes les 30s

export default async function HomePage() {
  const supabase = createAnonServerClient();

  const [{ data: trending }, { data: highlight }] = await Promise.all([
    supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("trending_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .eq("is_highlight", true)
      .limit(1)
      .maybeSingle(),
  ]);

  const initialPosts = (trending ?? []) as Post[];
  const highlightPost = (highlight ?? null) as Post | null;

  return <Feed initialPosts={initialPosts} highlight={highlightPost} />;
}
