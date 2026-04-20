import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/me/profile
// body: { bio?: string, first_name?: string, last_name?: string, password?: { current, new } }
export async function PATCH(req: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    bio?: unknown;
    first_name?: unknown;
    last_name?: unknown;
    password?: { current?: unknown; new?: unknown } | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Password change
  if (body.password && typeof body.password === "object") {
    const current = typeof body.password.current === "string" ? body.password.current : "";
    const next = typeof body.password.new === "string" ? body.password.new : "";
    if (next.length < 8) {
      return NextResponse.json({ error: "Mot de passe : 8 caractères minimum." }, { status: 422 });
    }
    if (!user.email) {
      return NextResponse.json({ error: "Compte sans email." }, { status: 400 });
    }
    // Vérifie le current via signIn
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (signErr) {
      return NextResponse.json({ error: "Mot de passe actuel invalide." }, { status: 401 });
    }
    const { error: updErr } = await supabase.auth.updateUser({ password: next });
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Profile fields
  const update: {
    bio?: string | null;
    first_name?: string;
    last_name?: string;
    updated_at?: string;
  } = {};
  if (typeof body.bio === "string") {
    const bio = body.bio.trim().slice(0, 200);
    update.bio = bio.length ? bio : null;
  }
  if (typeof body.first_name === "string") {
    const v = body.first_name.trim();
    if (v.length >= 1 && v.length <= 40) update.first_name = v;
  }
  if (typeof body.last_name === "string") {
    const v = body.last_name.trim();
    if (v.length >= 1 && v.length <= 40) update.last_name = v;
  }

  if (Object.keys(update).length > 0) {
    update.updated_at = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .update(update as never)
      .eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
