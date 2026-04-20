import { NextResponse } from "next/server";
import { checkAdminSecret } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// GET /api/admin/users → liste enrichie (profil + karma sommaire)
// Retourne AUSSI diagnostic (URL + projet + nombre) pour trancher tout cache/confusion.
export async function GET(req: Request) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));

  const supabase = createServiceClient();
  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (q) query = query.ilike("username", `%${q}%`);

  const { data: profiles, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const projectRef = supaUrl.replace(/^https?:\/\//, "").split(".")[0];

  console.log(
    `[admin users GET] project=${projectRef} total=${count} returned=${withStats.length} usernames=${JSON.stringify(withStats.map((u) => u.username))}`,
  );

  const res = NextResponse.json({
    users: withStats,
    _diag: {
      project_ref: projectRef,
      db_total_profiles: count ?? 0,
      returned_count: withStats.length,
      server_time: new Date().toISOString(),
      query_filter: q || null,
    },
  });
  res.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  res.headers.set("CDN-Cache-Control", "no-store");
  res.headers.set("Vercel-CDN-Cache-Control", "no-store");
  return res;
}
