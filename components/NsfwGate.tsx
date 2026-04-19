"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function NsfwGate({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="relative">
      <div className={cn("transition", !revealed && "pointer-events-none select-none blur-md")}>
        {children}
      </div>
      {!revealed && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="absolute inset-0 grid place-items-center gap-2"
        >
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-bg-soft/90 px-5 py-3 text-center backdrop-blur-sm">
            <EyeOff className="h-5 w-5 text-brand" />
            <div className="text-sm font-bold text-neutral-100">Contenu sensible</div>
            <div className="text-[11px] text-neutral-500">Clique pour afficher</div>
          </div>
        </button>
      )}
      {revealed && (
        <button
          type="button"
          onClick={() => setRevealed(false)}
          className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-bg-soft/80 px-2 py-1 text-[10px] text-neutral-400 backdrop-blur hover:text-neutral-100"
          aria-label="Masquer à nouveau"
        >
          <Eye className="h-3 w-3" />
          NSFW
        </button>
      )}
    </div>
  );
}
