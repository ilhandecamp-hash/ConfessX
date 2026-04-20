"use client";

import Link from "next/link";
import Image from "next/image";
import { Bookmark, Plus } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { AuthMenu } from "./AuthMenu";
import { NotificationsBell } from "./NotificationsBell";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="ConfessX — Accueil">
          <Image
            src="/logo.png"
            alt="ConfessX"
            width={36}
            height={36}
            priority
            className="h-9 w-9 object-contain"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <SearchBar />
        </div>

        <nav className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <NotificationsBell />
          <Link
            href="/bookmarks"
            className="grid h-9 w-9 place-items-center rounded-full text-neutral-400 transition hover:bg-bg-soft hover:text-neutral-100"
            aria-label="Favoris"
          >
            <Bookmark className="h-4 w-4" />
          </Link>
          <AuthMenu />
          <Link
            href="/new"
            className="flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-hover active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Confesser</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
