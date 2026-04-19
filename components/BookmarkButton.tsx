"use client";

import { Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";
import { cn } from "@/lib/utils";

export function BookmarkButton({ postId }: { postId: string }) {
  const [active, setActive] = useState(false);

  useEffect(() => setActive(isBookmarked(postId)), [postId]);

  function onClick() {
    const next = toggleBookmark(postId);
    setActive(next);
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 text-[11px] transition",
        active ? "text-brand" : "text-neutral-500 hover:text-neutral-100",
      )}
      aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Bookmark className={cn("h-3.5 w-3.5", active && "fill-current")} />
      {active ? "Sauvé" : "Sauver"}
    </button>
  );
}
