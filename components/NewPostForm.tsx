"use client";

import { EyeOff, Scale, Send, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CategoryPicker } from "./CategoryPicker";
import { MAX_CONTENT_LENGTH, type Category, type PostMode } from "@/types/post";
import { moderate } from "@/lib/moderation";
import { getOrCreateDeviceToken } from "@/lib/device";
import { cn } from "@/lib/utils";
import { useOwnership } from "@/contexts/OwnershipContext";
import { useAuth } from "@/contexts/AuthContext";

export function NewPostForm() {
  const router = useRouter();
  const { markOwned } = useOwnership();
  const { profile } = useAuth();
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [judgment, setJudgment] = useState(false);
  const [nsfw, setNsfw] = useState(false);
  const [anonymous, setAnonymous] = useState(!profile); // défaut : si pas connecté → anonymous
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_CONTENT_LENGTH - content.length;
  const canSubmit = content.trim().length >= 3 && category !== null && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!category) return;

    const mod = moderate(content);
    if (!mod.ok) {
      setError(mod.reason || "Contenu invalide.");
      return;
    }

    setSubmitting(true);
    try {
      const mode: PostMode = judgment ? "judgment" : "confession";
      const device_token = getOrCreateDeviceToken();
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          category,
          mode,
          nsfw,
          anonymous,
          device_token,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur serveur.");
        return;
      }
      markOwned(data.id);
      router.push(`/post/${data.id}`);
      router.refresh();
    } catch {
      setError("Connexion impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-2xl border border-border bg-bg-card p-4 focus-within:border-brand">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
          placeholder="Balance ta confession…"
          rows={5}
          className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-neutral-100 placeholder-neutral-600 focus:outline-none"
          autoFocus
        />
        <div className="mt-2 flex items-center justify-end">
          <span
            className={cn(
              "text-xs tabular-nums",
              remaining <= 20 ? "text-brand" : "text-neutral-500",
            )}
          >
            {remaining}
          </span>
        </div>
      </div>

      {/* Qui poste ? (si connecté) */}
      {profile && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Publier en tant que
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAnonymous(false)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border border-border bg-bg-soft py-3 transition",
                !anonymous ? "border-brand bg-brand/15 text-brand" : "text-neutral-300 hover:border-border-strong",
              )}
            >
              <UserRound className="h-4 w-4" />
              <span className="text-xs font-semibold">@{profile.username}</span>
              <span className="text-[10px] text-neutral-500">Visible pour tous</span>
            </button>
            <button
              type="button"
              onClick={() => setAnonymous(true)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border border-border bg-bg-soft py-3 transition",
                anonymous ? "border-brand bg-brand/15 text-brand" : "text-neutral-300 hover:border-border-strong",
              )}
            >
              <EyeOff className="h-4 w-4" />
              <span className="text-xs font-semibold">Anonyme</span>
              <span className="text-[10px] text-neutral-500">Rien ne te relie au post</span>
            </button>
          </div>
        </div>
      )}

      {/* Catégorie */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Catégorie
        </label>
        <CategoryPicker value={category} onChange={setCategory} />
      </div>

      {/* Options */}
      <div className="space-y-2">
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-bg-card p-4 transition",
            judgment ? "border-brand/60 bg-brand/5" : "hover:border-border-strong",
          )}
        >
          <input
            type="checkbox"
            checked={judgment}
            onChange={(e) => setJudgment(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
              <Scale className="h-4 w-4 text-brand" />
              Mode « Suis-je en tort ? »
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              Les autres voteront Oui / Non à la place de 😂😳💀.
            </p>
          </div>
        </label>

        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-bg-card p-4 transition",
            nsfw ? "border-red-500/60 bg-red-500/5" : "hover:border-border-strong",
          )}
        >
          <input
            type="checkbox"
            checked={nsfw}
            onChange={(e) => setNsfw(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-red-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
              <EyeOff className="h-4 w-4 text-red-400" />
              Contenu sensible (NSFW)
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              Le post sera flouté jusqu'à ce qu'on clique pour afficher.
            </p>
          </div>
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold text-white transition active:scale-[0.98]",
          "hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500",
        )}
      >
        <Send className="h-4 w-4" />
        {submitting
          ? "Envoi…"
          : anonymous || !profile
            ? "Publier anonymement"
            : `Publier en tant que @${profile.username}`}
      </button>

      {(anonymous || !profile) && (
        <p className="text-center text-[11px] text-neutral-600">
          Un identifiant anonyme est stocké dans ton navigateur pour te laisser éditer / supprimer tes posts.
        </p>
      )}
    </form>
  );
}
