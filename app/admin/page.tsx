"use client";

import {
  AlertTriangle,
  Ban,
  Check,
  Flag,
  KeyRound,
  Loader2,
  LogOut,
  Megaphone,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Undo2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Post, PostStatus } from "@/types/post";
import { formatRelative, cn, compactNumber } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";

const SECRET_KEY = "confessx_admin_secret";

type Scope = "all" | "pending" | "comments" | "reset_counters";
type ListScope = "reported" | "pending" | "all";
type Section = "moderation" | "users" | "announcements";
type AnnouncementType = "info" | "update" | "warning" | "event";

interface AdminAnnouncement {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  active: boolean;
  dismissible: boolean;
  created_at: string;
  expires_at: string | null;
}

interface Stats {
  total: number;
  published: number;
  pending: number;
  reported: number;
  comments: number;
}

interface AdminUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_seed: string;
  bio: string | null;
  banned: boolean;
  banned_reason: string | null;
  banned_at: string | null;
  created_at: string;
  posts_count: number;
  comments_count: number;
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [section, setSection] = useState<Section>("moderation");

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

      <div className="flex gap-1 rounded-full bg-bg-soft p-0.5">
        <TabBtn active={section === "moderation"} onClick={() => setSection("moderation")} icon={<Flag className="h-3.5 w-3.5" />} label="Modération" />
        <TabBtn active={section === "users"} onClick={() => setSection("users")} icon={<Users className="h-3.5 w-3.5" />} label="Utilisateurs" />
        <TabBtn active={section === "announcements"} onClick={() => setSection("announcements")} icon={<Megaphone className="h-3.5 w-3.5" />} label="Annonces" />
      </div>

      {section === "moderation" && <ModerationSection secret={secret} />}
      {section === "users" && <UsersSection secret={secret} />}
      {section === "announcements" && <AnnouncementsSection secret={secret} />}

      <Link href="/" className="block text-center text-xs text-neutral-600 hover:text-neutral-400">
        ← Retour au site
      </Link>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
        active ? "bg-brand text-white" : "text-neutral-400 hover:text-neutral-100",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Section modération ────────────────────────────────────────────

function ModerationSection({ secret }: { secret: string }) {
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
    const typed = prompt(`Es-tu sûr ? Tape "${confirmText}" pour confirmer.`);
    if (typed !== confirmText) return;
    setBusy(s);
    try {
      const res = await fetch(`/api/admin/posts?scope=${s}`, { method: "DELETE", headers });
      const data = await res.json();
      if (res.ok) {
        setFlash(data.message || "Terminé.");
        setTimeout(() => setFlash(null), 3000);
        await refresh();
      } else alert("Erreur : " + (data.error || res.status));
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
      {flash && (
        <div className="animate-slide-up rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
          ✓ {flash}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatCard label="Total" value={stats?.total} />
        <StatCard label="Publiés" value={stats?.published} tone="green" />
        <StatCard label="Masqués" value={stats?.pending} tone="orange" />
        <StatCard label="Signalés" value={stats?.reported} tone="red" />
        <StatCard label="Commentaires" value={stats?.comments} />
      </div>

      <div className="space-y-2 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-red-400">
          <AlertTriangle className="h-4 w-4" />
          Zone destructrice
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <DangerBtn onClick={() => wipe("all", "SUPPRIMER TOUT")} busy={busy === "all"} icon={<Trash2 className="h-4 w-4" />} label="Supprimer TOUS les posts" />
          <DangerBtn onClick={() => wipe("pending", "SUPPRIMER MASQUES")} busy={busy === "pending"} icon={<Flag className="h-4 w-4" />} label="Supprimer les posts masqués" />
          <DangerBtn onClick={() => wipe("comments", "SUPPRIMER COMMENTAIRES")} busy={busy === "comments"} icon={<Trash2 className="h-4 w-4" />} label="Supprimer tous les commentaires" />
          <DangerBtn onClick={() => wipe("reset_counters", "RESET")} busy={busy === "reset_counters"} icon={<RotateCcw className="h-4 w-4" />} label="Reset compteurs" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Files à modérer</h2>
          <div className="flex gap-1 rounded-full bg-bg-soft p-0.5 text-[11px]">
            {(["reported", "pending", "all"] as ListScope[]).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn("rounded-full px-2.5 py-1 font-semibold transition", scope === s ? "bg-brand text-white" : "text-neutral-400 hover:text-neutral-100")}
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
    </div>
  );
}

// ─── Section utilisateurs ──────────────────────────────────────────

function UsersSection({ secret }: { secret: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const headers = { "x-admin-secret": secret };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`, {
        headers,
        cache: "no-store",
      });
      if (!res.ok) return;
      const { users } = await res.json();
      setUsers(users as AdminUser[]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, secret]);

  useEffect(() => {
    const t = setTimeout(refresh, 300);
    return () => clearTimeout(t);
  }, [refresh]);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 4000);
  }

  async function ban(u: AdminUser) {
    const reason = prompt(`Raison du bannissement pour @${u.username} ?`, "Violation des règles");
    if (reason === null) return;
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ban", reason }),
    });
    if (res.ok) {
      showFlash(`@${u.username} banni.`);
      await refresh();
    } else {
      alert("Erreur.");
    }
  }

  async function unban(u: AdminUser) {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unban" }),
    });
    if (res.ok) {
      showFlash(`@${u.username} débanni.`);
      await refresh();
    }
  }

  async function resetPassword(u: AdminUser) {
    if (!confirm(`Réinitialiser le mot de passe de @${u.username} ?`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_password" }),
    });
    const data = await res.json();
    if (res.ok) {
      alert(`Nouveau mot de passe :\n${data.new_password}\n\nCopie-le avant de fermer !`);
    }
  }

  async function deleteUser(u: AdminUser, purge: boolean) {
    const prefix = purge ? "PURGE TOTALE" : "SUPPRIMER COMPTE";
    const typed = prompt(
      purge
        ? `⚠️ Supprime @${u.username} ET tous ses posts/commentaires. Tape "${prefix}" pour confirmer.`
        : `Supprime le compte @${u.username} (posts/commentaires restent, deviennent anonymes). Tape "${prefix}".`,
    );
    if (typed !== prefix) return;

    // Optimistic: retire immédiatement.
    setUsers((prev) => prev.filter((x) => x.id !== u.id));

    let deleteData: { debug?: unknown; error?: string } | null = null;

    try {
      const res = await fetch(`/api/admin/users/${u.id}${purge ? "?purge=1" : ""}`, {
        method: "DELETE",
        headers,
      });
      deleteData = await res.json().catch(() => ({ error: "Erreur inconnue." }));
      if (res.ok) {
        showFlash(`@${u.username} supprimé${purge ? " + contenu purgé" : ""}.`);
      } else {
        const debugTxt = deleteData?.debug
          ? "\n\nDebug: " + JSON.stringify(deleteData.debug, null, 2)
          : "";
        alert("Erreur : " + (deleteData?.error || res.status) + debugTxt);
        console.error("[admin delete error]", deleteData);
      }
    } catch (e) {
      alert("Erreur réseau : " + String(e));
    } finally {
      await refresh();
    }

    // Post-refresh : vérifie que le user a vraiment disparu. Sinon → diagnostic.
    setTimeout(async () => {
      try {
        const diagRes = await fetch(`/api/admin/diag/${u.id}`, { headers, cache: "no-store" });
        if (!diagRes.ok) return;
        const diag = await diagRes.json();
        if (diag.profile_exists || diag.auth_user_exists) {
          const msg =
            `⚠️ @${u.username} est toujours en base après suppression !\n\n` +
            `Diagnostic :\n${JSON.stringify(diag, null, 2)}\n\n` +
            (deleteData?.debug
              ? `Réponse delete :\n${JSON.stringify(deleteData.debug, null, 2)}\n\n`
              : "") +
            `→ Probable cause : un trigger 'handle_new_user' recrée le profile automatiquement (pattern de tutos Supabase).\n` +
            `→ Solution : exécute supabase/migration_v7_fix.sql dans le SQL Editor.`;
          alert(msg);
          console.error("[admin delete — user persisted]", { diag, deleteData });
          await refresh();
        }
      } catch {
        /* silencieux */
      }
    }, 500);
  }

  return (
    <div className="space-y-4">
      {flash && (
        <div className="animate-slide-up rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
          ✓ {flash}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Chercher un username…"
          className="w-full rounded-full border border-border bg-bg-soft py-2 pl-9 pr-4 text-sm placeholder-neutral-600 focus:border-brand focus:outline-none"
        />
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
        </p>
      ) : users.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">Aucun utilisateur.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border p-3",
                u.banned ? "border-red-500/30 bg-red-500/5" : "border-border bg-bg-card",
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar seed={u.avatar_seed} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-neutral-100">
                      {u.first_name} {u.last_name}
                    </p>
                    {u.banned && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-red-400">
                        Banni
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-neutral-500">
                    @{u.username} · {u.posts_count} posts · {u.comments_count} com · depuis{" "}
                    {formatRelative(u.created_at)}
                  </p>
                  {u.banned_reason && (
                    <p className="mt-0.5 text-[11px] text-red-400">Motif : {u.banned_reason}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Link
                  href={`/u/${u.username}`}
                  className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-neutral-300 hover:border-border-strong"
                >
                  <UserCog className="h-3 w-3" />
                  Voir profil
                </Link>
                {u.banned ? (
                  <button
                    onClick={() => unban(u)}
                    className="flex items-center gap-1 rounded-lg bg-green-500/15 px-2 py-1 text-[11px] font-semibold text-green-400 hover:bg-green-500/25"
                  >
                    <Undo2 className="h-3 w-3" />
                    Débannir
                  </button>
                ) : (
                  <button
                    onClick={() => ban(u)}
                    className="flex items-center gap-1 rounded-lg bg-accent-awkward/15 px-2 py-1 text-[11px] font-semibold text-accent-awkward hover:bg-accent-awkward/25"
                  >
                    <Ban className="h-3 w-3" />
                    Bannir
                  </button>
                )}
                <button
                  onClick={() => resetPassword(u)}
                  className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-neutral-300 hover:border-border-strong"
                >
                  <KeyRound className="h-3 w-3" />
                  Reset MDP
                </button>
                <button
                  onClick={() => deleteUser(u, false)}
                  className="flex items-center gap-1 rounded-lg bg-red-500/15 px-2 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/25"
                >
                  <Trash2 className="h-3 w-3" />
                  Supprimer
                </button>
                <button
                  onClick={() => deleteUser(u, true)}
                  className="flex items-center gap-1 rounded-lg bg-red-500/25 px-2 py-1 text-[11px] font-bold text-red-300 hover:bg-red-500/40"
                >
                  <Trash2 className="h-3 w-3" />
                  Purge totale
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Utilitaires ───────────────────────────────────────────────────

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

// ─── Section annonces ──────────────────────────────────────────────

function AnnouncementsSection({ secret }: { secret: string }) {
  const [items, setItems] = useState<AdminAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<AnnouncementType>("info");
  const [dismissible, setDismissible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const headers = { "x-admin-secret": secret };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements", { headers, cache: "no-store" });
      if (!res.ok) return;
      const { announcements } = await res.json();
      setItems(announcements as AdminAnnouncement[]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (title.trim().length < 1 || body.trim().length < 1) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          type,
          dismissible,
          active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Erreur.");
        return;
      }
      setTitle("");
      setBody("");
      setType("info");
      setDismissible(true);
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(a: AdminAnnouncement) {
    setItems((prev) =>
      prev.map((x) => (x.id === a.id ? { ...x, active: !x.active } : x)),
    );
    await fetch(`/api/admin/announcements/${a.id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ active: !a.active }),
    });
  }

  async function remove(a: AdminAnnouncement) {
    if (!confirm(`Supprimer l'annonce "${a.title}" ?`)) return;
    setItems((prev) => prev.filter((x) => x.id !== a.id));
    await fetch(`/api/admin/announcements/${a.id}`, { method: "DELETE", headers });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500">
          Les annonces actives apparaissent en bannière sur la home.
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-hover"
        >
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? "Fermer" : "Nouvelle annonce"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="animate-slide-down space-y-3 rounded-2xl border border-border bg-bg-card p-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Titre
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              placeholder="Ex : Nouveauté — feed Abonnements"
              className="w-full rounded-xl border border-border bg-bg-soft px-3 py-2 text-sm focus:border-brand focus:outline-none"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Description (Markdown léger accepté : **gras** *italique* https://…)
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 2000))}
              placeholder="Décris ce qui est nouveau…"
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-bg-soft px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </label>
          <div className="flex items-center justify-between gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Type
              </span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AnnouncementType)}
                className="rounded-xl border border-border bg-bg-soft px-3 py-2 text-sm focus:border-brand focus:outline-none"
              >
                <option value="info">ℹ️ Info</option>
                <option value="update">✨ Mise à jour</option>
                <option value="event">🎉 Événement</option>
                <option value="warning">⚠️ Attention</option>
              </select>
            </label>
            <label className="flex items-center gap-2 pt-5 text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={dismissible}
                onChange={(e) => setDismissible(e.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              Masquable par les users
            </label>
          </div>
          {err && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {err}
            </div>
          )}
          <button
            type="submit"
            disabled={saving || !title.trim() || !body.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Publier
          </button>
        </form>
      )}

      {loading ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
        </p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">Aucune annonce.</p>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div
              key={a.id}
              className={cn(
                "space-y-2 rounded-2xl border p-3",
                a.active ? "border-brand/30 bg-bg-card" : "border-border bg-bg-soft/50 opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-bg-soft px-2 py-0.5 text-[10px] uppercase text-neutral-400">
                      {a.type}
                    </span>
                    <p className="truncate text-sm font-bold">{a.title}</p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-xs text-neutral-400">{a.body}</p>
                  <p className="mt-1 text-[10px] text-neutral-600">
                    {formatRelative(a.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleActive(a)}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-[11px] font-bold transition",
                    a.active
                      ? "bg-accent-awkward/15 text-accent-awkward hover:bg-accent-awkward/25"
                      : "bg-green-500/15 text-green-400 hover:bg-green-500/25",
                  )}
                >
                  {a.active ? "Désactiver" : "Activer"}
                </button>
                <button
                  onClick={() => remove(a)}
                  className="flex-1 rounded-lg bg-red-500/15 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-500/25"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
