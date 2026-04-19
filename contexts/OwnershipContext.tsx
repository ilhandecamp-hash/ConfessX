"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { peekDeviceToken } from "@/lib/device";

// Partage entre tous les PostCard un Set<postId> "mes posts".
// On ne fetch /api/posts/mine qu'une seule fois par session.

interface Ctx {
  ownedIds: Set<string>;
  isOwner: (postId: string) => boolean;
  markOwned: (postId: string) => void;
  refresh: () => Promise<void>;
  ready: boolean;
}

const OwnershipContext = createContext<Ctx | null>(null);

export function OwnershipProvider({ children }: { children: ReactNode }) {
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const loadingRef = useRef(false);

  const refresh = useCallback(async () => {
    const token = peekDeviceToken();
    if (!token) {
      setOwnedIds(new Set());
      setReady(true);
      return;
    }
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const res = await fetch("/api/posts/mine", {
        headers: { "x-device-token": token },
        cache: "no-store",
      });
      if (!res.ok) return;
      const { posts } = (await res.json()) as { posts: { id: string }[] };
      setOwnedIds(new Set(posts.map((p) => p.id)));
    } finally {
      loadingRef.current = false;
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<Ctx>(
    () => ({
      ownedIds,
      isOwner: (id) => ownedIds.has(id),
      markOwned: (id) => setOwnedIds((s) => new Set(s).add(id)),
      refresh,
      ready,
    }),
    [ownedIds, refresh, ready],
  );

  return <OwnershipContext.Provider value={value}>{children}</OwnershipContext.Provider>;
}

export function useOwnership() {
  const ctx = useContext(OwnershipContext);
  if (!ctx) {
    // Fallback no-op (si composant utilisé hors provider, ex: pages admin)
    return {
      ownedIds: new Set<string>(),
      isOwner: () => false,
      markOwned: () => {},
      refresh: async () => {},
      ready: true,
    } as Ctx;
  }
  return ctx;
}
