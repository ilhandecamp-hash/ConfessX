"use client";

import Link from "next/link";
import { ChevronDown, LogIn, LogOut, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "./Avatar";

export function AuthMenu() {
  const { profile, signOut, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  if (!ready) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-bg-soft" />;
  }

  if (!profile) {
    return (
      <Link
        href="/auth/login"
        className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-neutral-300 transition hover:border-border-strong hover:text-neutral-100"
        aria-label="Se connecter"
      >
        <LogIn className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Connexion</span>
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full bg-bg-soft pr-2 pl-0.5 py-0.5 transition hover:bg-border"
        aria-label="Mon compte"
      >
        <Avatar seed={profile.avatar_seed} size="sm" />
        <span className="hidden text-xs font-semibold text-neutral-200 sm:inline">
          @{profile.username}
        </span>
        <ChevronDown className="h-3 w-3 text-neutral-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-52 animate-slide-up rounded-2xl border border-border bg-bg-card p-1 shadow-xl">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-neutral-100">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="truncate text-[11px] text-neutral-500">@{profile.username}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link
            href="/me"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-300 transition hover:bg-bg-soft hover:text-neutral-100"
          >
            <User className="h-4 w-4" />
            Mon profil
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-300 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
