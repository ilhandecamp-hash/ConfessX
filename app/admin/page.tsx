"use client";

import {
  AlertTriangle,
  Check,
  Flag,
  Loader2,
  LogOut,
  RotateCcw,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Post, PostStatus } from "@/types/post";
import { formatRelative, cn, compactNumber } from "@/lib/utils";

const SECRET_KEY = "confessx_admin_secret";

type Scope = "all" | "pending" | "comments" | "reset_counters";
type ListScope = "reported" | "pending" | "all";

interface Stats {
  total: number;
  published: number;
  pending: number;
  reported: number;
  comments: number;
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-login si secret en sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem(SECRET_KEY);
    if (!saved) {
      setChecking(false);
      return;
    }
    (async () => {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: saved }),
      });
      if (res.ok) {
        setSecret(saved);
        setAuthed(true);
      } else {
        sessionStorage.removeItem(SECRET_KEY);
      }
      setChecking(false);
    })();
  }, []);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    });
    if (res.ok) {
      sessionStorage.setItem(SECRET_KEY, secret);
      setAuthed(true);
    } else {
      setError("Secret invalide ou rate-limited.");
    }
  }

  function onLogout() {
    sessionStorage.removeItem(SECRET_KEY);
    setAuthed(false);
    setSecret("");
  }

  if (checking) {
    return (
      <div className="py-20 text-center text-sm text-neutral-500">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto mt-10 max-w-sm space-y-5">
        <div className="text-center">
          <Shield className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-3 text-xl font-extrabold">Admin</h1>
          <p className="mt-1 text-xs text-neutral-500">
            Zone privée. Entre le secret défini dans <code className="text-neutral-400">ADMIN_SECRET</code>.
          </p>
        </div>
        <form onSubmit={onLogin} className="space-y-3">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Secret admin"
            autoFocus
            className="w-full rounded-xl border border-border bg-bg-card px-4 py-3 text-sm focus:border-brand focus:outline-none"
          />
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover"
          >
            Entrer
          </button>
        </form>
      </div>
    );
  }

  return <Dashboard secret={secret} onLogout={onLogout} />;
}

// =====================================================================

function Dashboard({ secret, onLogout }: { secret: string; onLogout: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [list, setList] = useState<Post[]>([]);
  const [scope, setScope] = useState<ListScope>("reported");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Scope | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const headers = { "x-admin-secret": secret };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        fetch("/api/admin/stats", { headers, cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/posts?scope=${scope}`, { headers, cache: "no-store" }).then((r) => r.json()),
      ]);
      setStats(s);
      setList(p.posts ?? []);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, secret]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function wipe(s: Scope, confirmText: string) {
    const typed = prompt(
      `Es-tu sûr ? Tape "${confirmText}" pour confirmer (irréversible).`,
    );
    if (typed !== confirmText) return;
    setBusy(s);
    try {
      const res = await fetch(`/api/admin/posts?scope=${s}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (res.ok) {
        setFlash(data.message || "Terminé.");
        setTimeout(() => setFlash(null), 3000);
        await refresh();
      } else {
        alert("Erreur : " + (data.error || res.status));
      }
    } finally {
      setBusy(null);
    }
  }

  async function deleteOne(id: string) {
    if (!confirm("Supprimer ce post ?")) return;
    const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE", headers });
    if (res.ok) {
      setList((prev) => prev.filter((p) => p.id !== id));
      void refresh();
    }
  }

  async function setStatus(id: string, status: PostStatus) {
    const res = await fetch(`/api/admin/posts/${id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-brand" />
          <h1 className="text-xl font-extrabold">Admin</h1>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-100"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>

      {flash && (
        <div className="animate-slide-up rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
          ✓ {flash}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatCard label="Total posts" value={stats?.total} />
        <StatCard label="Publiés" value={stats?.published} tone="green" />
        <StatCard label="Masqués" value={stats?.pending} tone="orange" />
        <StatCard label="Signalés" value={stats?.reported} tone="red" />
        <StatCard label="Commentaires" value={stats?.comments} />
      </div>

      {/* Actions destructrices */}
      <div className="space-y-2 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-red-400">
          <AlertTriangle className="h-4 w-4" />
          Zone destructrice
        </div>
        <p className="text-xs text-neutral-500">Actions irréversibles. On te demandera de retaper un mot de confirmation.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <DangerBtn
            onClick={() => wipe("all", "SUPPRIMER TOUT")}
            busy={busy === "all"}
            icon={<Trash2 className="h-4 w-4" />}
            label="Supprimer TOUS les posts"
          />
          <DangerBtn
            onClick={() => wipe("pending", "SUPPRIMER MASQUES")}
            busy={busy === "pending"}
            icon={<Flag className="h-4 w-4" />}
            label="Supprimer les posts masqués"
          />
          <DangerBtn
            onClick={() => wipe("comments", "SUPPRIMER COMMENTAIRES")}
            busy={busy === "comments"}
            icon={<Trash2 className="h-4 w-4" />}
            label="Supprimer tous les commentaires"
          />
          <DangerBtn
            onClick={() => wipe("reset_counters", "RESET")}
            busy={busy === "reset_counters"}
            icon={<RotateCcw className="h-4 w-4" />}
            label="Reset compteurs (garde les posts)"
          />
        </div>
      </div>

      {/* Liste de modération */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            Modération
          </h2>
          <div className="flex gap-1 rounded-full bg-bg-soft p-0.5 text-[11px]">
            {(["reported", "pending", "all"] as ListScope[]).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  "rounded-full px-2.5 py-1 font-semibold transition",
                  scope === s ? "bg-brand text-white" : "text-neutral-400 hover:text-neutral-100",
                )}
              >
                {s === "reported" ? "Signalés" : s === "pending" ? "Masqués" : "Tous"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-neutral-500">
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          </p>
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">Rien à modérer. 🎉</p>
        ) : (
          <div className="space-y-2">
            {list.map((p) => (
              <AdminPostRow
                key={p.id}
                post={p}
                onDelete={() => deleteOne(p.id)}
                onApprove={() => setStatus(p.id, "published")}
                onReject={() => setStatus(p.id, "rejected")}
              />
            ))}
          </div>
        )}
      </div>

      <Link href="/" className="block text-center text-xs text-neutral-600 hover:text-neutral-400">
        ← Retour au site
      </Link>
    </div>
  );
}

// =====================================================================

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | undefined;
  tone?: "green" | "orange" | "red";
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-3 text-center">
      <div
        className={cn(
          "text-xl font-extrabold tabular-nums",
          tone === "green" && "text-green-400",
          tone === "orange" && "text-accent-awkward",
          tone === "red" && "text-red-400",
        )}
      >
        {value == null ? "…" : compactNumber(value)}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
    </div>
  );
}

function DangerBtn({
  onClick,
  busy,
  icon,
  label,
}: {
  onClick: () => void;
  busy: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 py-2.5 text-xs font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function AdminPostRow({
  post,
  onDelete,
  onApprove,
  onReject,
}: {
  post: Post;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const totalVotes =
    post.funny_count +
    post.awkward_count +
    post.serious_count +
    post.yes_count +
    post.no_count;
  return (
    <div className="rounded-xl border border-border bg-bg-card p-3">
      <div className="mb-1 flex items-center justify-between text-[11px] text-neutral-500">
        <span>
          {formatRelative(post.created_at)} · {post.category} ·{" "}
          <span
            className={cn(
              post.status === "pending" && "text-accent-awkward",
              post.status === "rejected" && "text-red-400",
              post.status === "published" && "text-green-400",
            )}
          >
            {post.status}
          </span>
        </span>
        {post.report_count > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <Flag className="h-3 w-3" />
            {post.report_count}
          </span>
        )}
      </div>
      <p className="mb-2 whitespace-pre-wrap break-words text-sm text-neutral-100">
        {post.content}
      </p>
      <div className="mb-2 flex gap-3 text-[11px] text-neutral-500">
        <span>👁 {post.view_count}</span>
        <span>🗳 {totalVotes}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onApprove}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-500/15 py-1.5 text-[11px] font-bold text-green-400 hover:bg-green-500/25"
        >
          <Check className="h-3 w-3" />
          Approuver
        </button>
        <button
          onClick={onReject}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-accent-awkward/15 py-1.5 text-[11px] font-bold text-accent-awkward hover:bg-accent-awkward/25"
        >
          <X className="h-3 w-3" />
          Rejeter
        </button>
        <button
          onClick={onDelete}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-500/15 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-500/25"
        >
          <Trash2 className="h-3 w-3" />
          Supprimer
        </button>
      </div>
    </div>
  );
}
