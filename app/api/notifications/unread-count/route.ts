import { NextResponse } from "next/server";
import { createServerSupabase, createAnonServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Renvoie le nombre de notifs non lues + la liste des id d'annonces actives.
// Le client soustrait les annonces qu'il a dismissées localement.
export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const anon = createAnonServerClient();
  const { data: aData } = await anon
    .from("announcements")
    .select("id, expires_at")
    .eq("active", true)
    .limit(50);
  const now = Date.now();
  const activeIds = (aData ?? [])
    .filter((a) => !a.expires_at || new Date(a.expires_at).getTime() > now)
    .map((a) => a.id);

  if (!user) {
    return NextResponse.json({ unread: 0, announcement_ids: activeIds });
  }

  const { data } = await supabase.rpc("count_unread_notifications");
  return NextResponse.json({ unread: data ?? 0, announcement_ids: activeIds });
}
