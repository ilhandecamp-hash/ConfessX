import { NextResponse } from "next/server";
import { checkAdminSecret } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const [total, published, pending, reported, comments] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("posts").select("*", { count: "exact", head: true }).gt("report_count", 0),
    supabase.from("comments").select("*", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    total:     total.count ?? 0,
    published: published.count ?? 0,
    pending:   pending.count ?? 0,
    reported:  reported.count ?? 0,
    comments:  comments.count ?? 0,
  });
}
