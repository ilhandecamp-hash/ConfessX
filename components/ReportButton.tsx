"use client";

import { Flag } from "lucide-react";
import { useState } from "react";
import { Modal } from "./Modal";
import { REPORT_REASONS, type ReportReason } from "@/types/post";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "confessx_reports";

function wasReported(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").includes(id);
  } catch {
    return false;
  }
}

function markReported(id: string) {
  try {
    const arr: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!arr.includes(id)) arr.push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

interface Props {
  postId?: string;
  commentId?: string;
  compact?: boolean;
}

export function ReportButton({ postId, commentId, compact }: Props) {
  const targetId = postId || commentId || "";
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState<boolean>(() => wasReported(targetId));
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");

  async function submit() {
    if (reported || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, commentId, reason }),
      });
      if (res.ok) {
        markReported(targetId);
        setReported(true);
        setOpen(false);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => !reported && setOpen(true)}
        disabled={reported || busy}
        className={cn(
          "flex items-center gap-1 transition",
          compact ? "text-[11px]" : "text-xs",
          reported ? "cursor-default text-brand" : "text-neutral-500 hover:text-brand",
        )}
        aria-label="Signaler"
      >
        <Flag className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        {reported ? "Signalé" : "Signaler"}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Signaler ce contenu">
        <p className="mb-3 text-sm text-neutral-400">
          Pourquoi veux-tu signaler ce {postId ? "post" : "commentaire"} ?
        </p>
        <div className="space-y-2">
          {REPORT_REASONS.map((r) => (
            <label
              key={r.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition",
                reason === r.id ? "border-brand bg-brand/10" : "hover:border-border-strong",
              )}
            >
              <input
                type="radio"
                name="reason"
                value={r.id}
                checked={reason === r.id}
                onChange={() => setReason(r.id)}
                className="accent-brand"
              />
              <span className="text-sm">{r.label}</span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setOpen(false)}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-border-strong"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-white transition hover:bg-brand-hover disabled:opacity-50"
          >
            {busy ? "Envoi…" : "Signaler"}
          </button>
        </div>
      </Modal>
    </>
  );
}
