"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/post";

interface AuthState {
  userId: string | null;
  profile: Profile | null;
  ready: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({
  children,
  initialProfile,
  initialUserId,
}: {
  children: ReactNode;
  initialProfile: Profile | null;
  initialUserId: string | null;
}) {
  const [userId, setUserId] = useState<string | null>(initialUserId);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [ready, setReady] = useState(true);

  const refresh = useCallback(async () => {
    setReady(false);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        setProfile((data as Profile | null) ?? null);
      } else {
        setProfile(null);
      }
    } finally {
      setReady(true);
    }
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUserId(null);
    setProfile(null);
    if (typeof window !== "undefined") window.location.reload();
  }, []);

  // Réagit aux changements de session (login/logout dans un autre onglet)
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUserId = session?.user?.id ?? null;
      if (newUserId !== userId) void refresh();
    });
    return () => subscription.unsubscribe();
  }, [userId, refresh]);

  const value = useMemo<AuthState>(
    () => ({ userId, profile, ready, refresh, signOut }),
    [userId, profile, ready, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      userId: null,
      profile: null,
      ready: true,
      refresh: async () => {},
      signOut: async () => {},
    } satisfies AuthState;
  }
  return ctx;
}
