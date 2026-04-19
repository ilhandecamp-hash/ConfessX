import { NextResponse } from "next/server";
import { createAnonServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/search?q=...
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ posts: [] });

  const supabase = createAnonServerClient();
  const { data, error } = await supabase.rpc("search_posts", { p_query: q, p_limit: 30 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}
