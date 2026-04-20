import { NextResponse } from "next/server";
import { createServerSupabase, createAnonServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Annonces publiques — renvoyées pour tous (loguée ou pas).
  const anon = createAnonServerClient();
  const { data: aData } = await anon
    .from("announcements")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(20);
  const now = Date.now();
  const announcements = (aData ?? []).filter(
    (a) => !a.expires_at || new Date(a.expires_at).getTime() > now,
  );

  if (!user) {
    return NextResponse.json({ items: [], unread: 0, announcements });
  }

  const [listRes, countRes] = await Promise.all([
    supabase.rpc("list_notifications", { p_limit: 50 } as never),
    supabase.rpc("count_unread_notifications"),
  ]);

  return NextResponse.json({
    items: listRes.data ?? [],
    unread: countRes.data ?? 0,
    announcements,
  });
}

export async function PATCH() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
