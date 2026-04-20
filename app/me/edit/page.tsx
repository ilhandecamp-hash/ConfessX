"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export default function EditProfilePage() {
  const router = useRouter();
  const { profile, refresh, ready } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  if (!ready) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <p className="py-8 text-center text-sm text-neutral-500">Connecte-toi d'abord.</p>
        <Link
          href="/auth/login"
          className="block rounded-full bg-brand py-2 text-center text-sm font-bold text-white"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  async function saveProfile() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          bio: bio.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Erreur.");
        return;
      }
      await refresh();
      setFlash("Profil mis à jour ✓");
      setTimeout(() => setFlash(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    if (newPwd.length < 8) {
      setErr("Nouveau mot de passe : 8 caractères min.");
      return;
    }
    setPwdSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: { current: curPwd, new: newPwd } }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Erreur.");
        return;
      }
      setFlash("Mot de passe changé ✓");
      setCurPwd("");
      setNewPwd("");
      setTimeout(() => setFlash(null), 3000);
    } finally {
      setPwdSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link
        href="/me"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au profil
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight">Éditer mon profil</h1>

      {flash && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
          {flash}
        </div>
      )}
      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {err}
        </div>
      )}

      <section className="space-y-3 rounded-2xl border border-border bg-bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Infos publiques</h2>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Prénom" value={firstName} onChange={setFirstName} />
          <Field label="Nom" value={lastName} onChange={setLastName} />
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Bio <span className="text-neutral-600">(200 car. max)</span>
          </span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 200))}
            rows={3}
            placeholder="Quelques mots sur toi…"
            className="w-full resize-none rounded-xl border border-border bg-bg-soft px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:border-brand focus:outline-none"
          />
          <span className="mt-0.5 block text-right text-[10px] text-neutral-600 tabular-nums">
            {200 - bio.length}
          </span>
        </label>

        <button
          onClick={saveProfile}
          disabled={saving}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition hover:bg-brand-hover disabled:opacity-50",
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-400">
          <Shield className="h-3.5 w-3.5" />
          Sécurité
        </h2>

        <Field
          label="Mot de passe actuel"
          value={curPwd}
          onChange={setCurPwd}
          type="password"
          autoComplete="current-password"
        />
        <Field
          label="Nouveau mot de passe"
          value={newPwd}
          onChange={setNewPwd}
          type="password"
          autoComplete="new-password"
          placeholder="8 caractères minimum"
        />

        <button
          onClick={savePassword}
          disabled={pwdSaving || !curPwd || newPwd.length < 8}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-border-strong disabled:opacity-40"
        >
          {pwdSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          Changer le mot de passe
        </button>
      </section>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-bg-soft px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-brand focus:outline-none"
      />
    </label>
  );
}
