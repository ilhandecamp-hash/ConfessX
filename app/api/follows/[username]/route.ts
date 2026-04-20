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

// GET : suis-je abonné à cet utilisateur ?
export async function GET(_req: Request, { params }: Params) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ following: false });

  const targetId = await resolveTarget(params.username);
  if (!targetId) return NextResponse.json({ following: false });

  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("followed_id", targetId)
    .maybeSingle();

  return NextResponse.json({ following: !!data, targetId });
}

// POST : follow
export async function POST(_req: Request, { params }: Params) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targetId = await resolveTarget(params.username);
  if (!targetId) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (targetId === user.id) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, followed_id: targetId } as never);
  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE : unfollow
export async function DELETE(_req: Request, { params }: Params) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targetId = await resolveTarget(params.username);
  if (!targetId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("followed_id", targetId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
