import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./types";

interface CookieItem {
  name: string;
  value: string;
  options?: CookieOptions;
}

// ───────────────────────────────────────────────────────────────────
// Server-side clients
// ───────────────────────────────────────────────────────────────────

// Client anonyme avec cookie de session → utiliser dans les Server Components / Route Handlers.
// Si l'utilisateur est connecté, les requêtes SELECT profitent de son JWT.
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(list: CookieItem[]) {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set({ name, value, ...(options ?? {}) }),
            );
          } catch {
            // Appelé depuis un Server Component — on ignore (cookies déjà envoyés).
          }
        },
      },
    },
  );
}

// Service Role (bypass RLS) — SERVER ONLY, jamais exposé au browser.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE env vars (URL or SERVICE_ROLE_KEY).");
  }
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Alias rétrocompat — routes API / Server Components qui n'ont pas besoin de la session.
export function createAnonServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// Helper : récupère user + profile en une seule passe (server-side).
export async function getCurrentUser() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile };
}
