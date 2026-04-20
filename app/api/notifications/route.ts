import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [], unread: 0 });

  const [listRes, countRes] = await Promise.all([
    supabase.rpc("list_notifications", { p_limit: 50 } as never),
    supabase.rpc("count_unread_notifications"),
  ]);

  return NextResponse.json({
    items: listRes.data ?? [],
    unread: countRes.data ?? 0,
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
