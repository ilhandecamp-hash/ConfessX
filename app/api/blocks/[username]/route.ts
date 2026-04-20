import { NextResponse } from "next/server";
import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params { params: { username: string } }

async function resolveTarget(username: string): Promise<string | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("id")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  return data?.id ?? null;
}

export async function GET(_req: Request, { params }: Params) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ blocked: false });

  const targetId = await resolveTarget(params.username);
  if (!targetId) return NextResponse.json({ blocked: false });

  const { data } = await supabase
    .from("blocks")
    .select("blocker_id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetId)
    .maybeSingle();

  return NextResponse.json({ blocked: !!data });
}

export async function POST(_req: Request, { params }: Params) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targetId = await resolveTarget(params.username);
  if (!targetId) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (targetId === user.id) return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });

  // On supprime aussi le follow s'il existe
  await supabase.from("follows").delete().or(`and(follower_id.eq.${user.id},followed_id.eq.${targetId}),and(follower_id.eq.${targetId},followed_id.eq.${user.id})`);

  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: user.id, blocked_id: targetId } as never);
  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targetId = await resolveTarget(params.username);
  if (!targetId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
