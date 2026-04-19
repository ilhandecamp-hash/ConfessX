import { NextResponse } from "next/server";
import { createAnonServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = (url.searchParams.get("u") || "").trim().toLowerCase();
  if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(username)) {
    return NextResponse.json({ available: false, reason: "format" });
  }
  const supabase = createAnonServerClient();
  const { data } = await supabase.rpc("username_available", { p_username: username });
  return NextResponse.json({ available: !!data });
}
