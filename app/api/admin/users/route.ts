import { NextResponse } from "next/server";
import { checkAdminSecret } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/users → liste enrichie (profil + karma sommaire)
export async function GET(req: Request) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));

  const supabase = createServiceClient();
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(limit);
  if (q) query = query.ilike("username", `%${q}%`);

  const { data: profiles, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pour chaque profile, cherche stats rapides
  const withStats = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const [{ count: postsCount }, { count: commentsCount }] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", p.id),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", p.id),
      ]);
      return {
        ...p,
        posts_count: postsCount ?? 0,
        comments_count: commentsCount ?? 0,
      };
    }),
  );

  const res = NextResponse.json({ users: withStats });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
