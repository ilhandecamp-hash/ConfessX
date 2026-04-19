"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const s = q.trim();
    if (s.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(s)}`);
  }

  return (
    <form onSubmit={onSubmit} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher une confession…"
        className="w-full rounded-full border border-border bg-bg-soft py-2 pl-9 pr-4 text-sm text-neutral-100 placeholder-neutral-600 focus:border-brand focus:outline-none"
      />
    </form>
  );
}
