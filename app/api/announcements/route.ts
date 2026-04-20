import { NextResponse } from "next/server";
import { createAnonServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/announcements → annonces actives (public)
export async function GET() {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const active = (data ?? []).filter(
    (a) => !a.expires_at || new Date(a.expires_at).getTime() > now,
  );

  return NextResponse.json({ announcements: active });
}
