import Link from "next/link";
import { Avatar } from "./Avatar";
import type { Profile } from "@/types/post";

// Affiche soit l'avatar + username de l'auteur (compte), soit "Anonyme" avec avatar aléatoire.
interface Props {
  author?: Profile | null;
  fallbackSeed: string;
}

export function AuthorBadge({ author, fallbackSeed }: Props) {
  if (author) {
    return (
      <Link
        href={`/u/${author.username}`}
        className="flex items-center gap-1.5 transition hover:text-neutral-100"
      >
        <Avatar seed={author.avatar_seed || author.id} size="sm" />
        <span className="text-[12px] font-semibold text-neutral-300">@{author.username}</span>
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <Avatar seed={fallbackSeed} size="sm" />
      <span className="text-[11px] text-neutral-500">Anonyme</span>
    </div>
  );
}
