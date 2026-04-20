"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type UsernameState = "idle" | "checking" | "available" | "taken" | "invalid";

const USERNAME_RX = /^[a-zA-Z0-9_.-]{3,20}$/;

export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uState, setUState] = useState<UsernameState>("idle");
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-suggest username depuis prénom+nom si user n'a pas encore tapé
  useEffect(() => {
    if (username === "" && first && last) {
      const suggest = (first + "." + last)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9._-]/g, "")
        .slice(0, 20);
      if (suggest.length >= 3) setUsername(suggest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, last]);

  // Check disponibilité (debounced)
  useEffect(() => {
    if (tRef.current) clearTimeout(tRef.current);
    if (!username) {
      setUState("idle");
      return;
    }
    if (!USERNAME_RX.test(username)) {
      setUState("invalid");
      return;
    }
    setUState("checking");
    tRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/username-check?u=${encodeURIComponent(username)}`);
        const data = await res.json();
        setUState(data.available ? "available" : "taken");
      } catch {
        setUState("idle");
      }
    }, 400);
  }, [username]);

  const canSubmit =
    first.trim().length >= 1 &&
    last.trim().length >= 1 &&
    USERNAME_RX.test(username) &&
    uState === "available" &&
    password.length >= 8 &&
    !busy;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: first.trim(),
          last_name: last.trim(),
          username: username.trim().toLowerCase(),
          password,
          email: email.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur inconnue.");
        return;
      }
      await refresh();
      router.push("/me");
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
          <UserPlus className="h-5 w-5 text-brand" />
          <h1 className="text-2xl font-extrabold tracking-tight">Créer un compte</h1>
        </div>
        <p className="text-xs text-neutral-500">
          Ou reste 100% anonyme en postant directement sans compte.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Prénom" value={first} onChange={setFirst} autoComplete="given-name" />
          <Field label="Nom" value={last} onChange={setLast} autoComplete="family-name" />
        </div>

        <div className="space-y-1">
          <Field
            label="Nom d'utilisateur"
            value={username}
            onChange={(v) => setUsername(v.toLowerCase())}
            autoComplete="username"
            placeholder="prenom.nom"
            rightIcon={<UsernameBadge state={uState} />}
          />
          {uState === "invalid" && (
            <p className="text-[11px] text-red-400">3-20 caractères · lettres, chiffres, . _ -</p>
          )}
          {uState === "taken" && <p className="text-[11px] text-red-400">Déjà pris.</p>}
          {uState === "available" && (
            <p className="text-[11px] text-green-400">Disponible ✓</p>
          )}
        </div>

        <Field
          label="Mot de passe"
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete="new-password"
          placeholder="8 caractères minimum"
        />

        <div className="space-y-1">
          <Field
            label="Email (optionnel)"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="email"
            placeholder="Pour récupérer ton mot de passe"
          />
          <p className="text-[11px] text-neutral-600">
            Sans email : si tu oublies ton mot de passe, ton compte est perdu.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {busy ? "Création…" : "Créer mon compte"}
        </button>
      </form>

      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-center text-xs text-neutral-500">
          Déjà un compte ?{" "}
          <Link href="/auth/login" className="text-brand hover:underline">
            Se connecter
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  rightIcon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  rightIcon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
        {label}
      </span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-bg-card px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-brand focus:outline-none"
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightIcon}</span>
        )}
      </div>
    </label>
  );
}

function UsernameBadge({ state }: { state: UsernameState }) {
  if (state === "checking") return <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />;
  if (state === "available")
    return (
      <span className={cn("grid h-5 w-5 place-items-center rounded-full bg-green-500/20 text-green-400")}>
        <Check className="h-3 w-3" />
      </span>
    );
  if (state === "taken" || state === "invalid")
    return (
      <span className={cn("grid h-5 w-5 place-items-center rounded-full bg-red-500/20 text-red-400")}>
        <X className="h-3 w-3" />
      </span>
    );
  return null;
}
