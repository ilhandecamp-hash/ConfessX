import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-bg-soft", className)} />;
}

export function PostSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Bar className="h-6 w-6 rounded-full" />
        <Bar className="h-4 w-20" />
        <Bar className="h-4 w-16" />
      </div>
      <Bar className="mb-2 h-4 w-full" />
      <Bar className="mb-2 h-4 w-[85%]" />
      <Bar className="mb-4 h-4 w-[60%]" />
      <div className="grid grid-cols-3 gap-2">
        <Bar className="h-14 rounded-xl" />
        <Bar className="h-14 rounded-xl" />
        <Bar className="h-14 rounded-xl" />
      </div>
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-bg-soft p-3">
      <div className="mb-2 flex items-center gap-2">
        <Bar className="h-6 w-6 rounded-full" />
        <Bar className="h-3 w-28" />
      </div>
      <Bar className="mb-1 ml-8 h-3 w-[80%]" />
      <Bar className="ml-8 h-3 w-[50%]" />
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}
