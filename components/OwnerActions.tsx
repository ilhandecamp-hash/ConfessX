"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { peekDeviceToken } from "@/lib/device";
import { EDIT_WINDOW_MINUTES, MAX_CONTENT_LENGTH, type Post } from "@/types/post";
import { Modal } from "./Modal";
import { cn } from "@/lib/utils";
import { useOwnership } from "@/contexts/OwnershipContext";

interface Props {
  post: Post;
  onDeleted?: () => void;
  onEdited?: (newContent: string) => void;
}

export function OwnerActions({ post, onDeleted, onEdited }: Props) {
  const router = useRouter();
  const { isOwner, refresh } = useOwnership();
  const [editOpen, setEditOpen] = useState(false);
  const [content, setContent] = useState(post.content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner(post.id)) return null;

  const minutesSince = (Date.now() - new Date(post.created_at).getTime()) / 60000;
  const canEdit = minutesSince <= EDIT_WINDOW_MINUTES;

  async function handleDelete() {
    const token = peekDeviceToken();
    if (!token) return;
    if (!confirm("Supprimer définitivement ce post ?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
        headers: { "x-device-token": token },
      });
      if (res.ok) {
        onDeleted?.();
        await refresh();
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleEdit() {
    const token = peekDeviceToken();
    if (!token) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-device-token": token,
        },
        body: JSON.stringify({ content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur.");
        return;
      }
      onEdited?.(content.trim());
      setEditOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {canEdit && (
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1 text-[11px] text-neutral-500 transition hover:text-neutral-100"
          >
            <Pencil className="h-3 w-3" />
            Éditer
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={busy}
          className="flex items-center gap-1 text-[11px] text-neutral-500 transition hover:text-red-400"
        >
          <Trash2 className="h-3 w-3" />
          Supprimer
        </button>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Éditer la confession">
        <p className="mb-3 text-xs text-neutral-500">
          Tu peux éditer ce post pendant {EDIT_WINDOW_MINUTES} minutes après publication.
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
          rows={5}
          className="w-full resize-none rounded-xl border border-border bg-bg-soft p-3 text-[15px] leading-relaxed focus:border-brand focus:outline-none"
        />
        <div className="mt-1 text-right text-xs text-neutral-500 tabular-nums">
          {MAX_CONTENT_LENGTH - content.length}
        </div>
        {error && (
          <div className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setEditOpen(false)}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-border-strong"
          >
            Annuler
          </button>
          <button
            onClick={handleEdit}
            disabled={busy || content.trim().length < 3}
            className={cn(
              "flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition hover:bg-brand-hover disabled:opacity-50",
            )}
          >
            {busy ? "Envoi…" : "Enregistrer"}
          </button>
        </div>
      </Modal>
    </>
  );
}
