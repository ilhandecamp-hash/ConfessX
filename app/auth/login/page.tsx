"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur inconnue.");
        return;
      }
      // Rafraîchit le AuthContext côté client pour que le header se mette à jour
      // sans reload manuel.
      await refresh();
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <LogIn className="h-5 w-5 text-brand" />
          <h1 className="text-2xl font-extrabold tracking-tight">Se connecter</h1>
        </div>
        <p className="text-xs text-neutral-500">
          Connecte-toi pour retrouver ton karma et tes posts sur tous tes appareils.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Nom d'utilisateur ou email
          </span>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            autoFocus
            className="w-full rounded-xl border border-border bg-bg-card px-3 py-2.5 text-sm text-neutral-100 focus:border-brand focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Mot de passe
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-xl border border-border bg-bg-card px-3 py-2.5 text-sm text-neutral-100 focus:border-brand focus:outline-none"
          />
        </label>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !identifier || !password}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {busy ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-center text-xs text-neutral-500">
          Pas encore de compte ?{" "}
          <Link href="/auth/signup" className="text-brand hover:underline">
            Créer un compte
          </Link>
        </p>
        <p className="text-center text-xs text-neutral-600">
          Ou{" "}
          <Link href="/new" className="underline hover:text-neutral-300">
            poster anonymement sans compte
          </Link>
        </p>
      </div>
    </div>
  );
}
