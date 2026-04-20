import { NextResponse } from "next/server";
import { checkAdminSecret } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vérifie quelle DB Supabase on interroge réellement côté serveur.
// Compare la URL/key prefix avec ce qui est dans ton Dashboard Supabase.
export async function GET(req: Request) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "(missing)";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "(missing)";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "(missing)";

  // Extract project ref from URL (ex: lwyekxccodwjdwcwytoo)
  const projectRef = url.replace(/^https?:\/\//, "").split(".")[0];

  const supabase = createServiceClient();

  // Query directe profiles
  const { data: profiles, count } = await supabase
    .from("profiles")
    .select("id, username, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);

  const res = NextResponse.json({
    supabase_url: url,
    project_ref: projectRef,
    anon_key_prefix: anonKey.slice(0, 15) + "…",
    service_key_prefix: serviceKey.slice(0, 15) + "…",
    server_time: new Date().toISOString(),
    total_profiles: count ?? 0,
    profiles: profiles ?? [],
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
