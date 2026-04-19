import { Sparkles } from "lucide-react";
import type { Post } from "@/types/post";
import { PostCard } from "./PostCard";

export function HighlightCard({ post }: { post: Post }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-brand">
        <Sparkles className="h-3.5 w-3.5" />
        Confession du jour
      </div>
      <PostCard post={post} highlight />
    </section>
  );
}
