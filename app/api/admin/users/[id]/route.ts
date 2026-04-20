import { NextResponse } from "next/server";
import { checkAdminSecret } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

// DELETE /api/admin/users/:id?purge=1 — robuste : ne fail jamais si le user a déjà été partiellement supprimé.
export async function DELETE(req: Request, { params }: Params) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const purge = url.searchParams.get("purge") === "1";

  const supabase = createServiceClient();

  if (purge) {
    // On purge posts & comments de ce user avant.
    await supabase.from("posts").delete().eq("user_id", params.id);
    await supabase.from("comments").delete().eq("user_id", params.id);
  }

  // Supprime le profile (cascade pour follows/blocks/hidden/notifications).
  await supabase.from("profiles").delete().eq("id", params.id);

  // Supprime l'user Supabase Auth — ignore si déjà parti.
  const { error } = await supabase.auth.admin.deleteUser(params.id);
  if (error) {
    const msg = error.message.toLowerCase();
    const alreadyGone =
      msg.includes("not found") ||
      msg.includes("does not exist") ||
      msg.includes("user_not_found");
    if (!alreadyGone) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, purged: purge });
}

// PATCH /api/admin/users/:id  { action: 'ban'|'unban'|'reset_password', reason?, new_password? }
export async function PATCH(req: Request, { params }: Params) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: unknown; reason?: unknown; new_password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const action = body.action as string;
  const supabase = createServiceClient();

  if (action === "ban") {
    const reason = typeof body.reason === "string" ? body.reason : null;
    const { error } = await supabase
      .from("profiles")
      .update({ banned: true, banned_reason: reason, banned_at: new Date().toISOString() } as never)
      .eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase.auth.admin.updateUserById(params.id, { ban_duration: "87600h" });
    return NextResponse.json({ ok: true });
  }

  if (action === "unban") {
    const { error } = await supabase
      .from("profiles")
      .update({ banned: false, banned_reason: null, banned_at: null } as never)
      .eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase.auth.admin.updateUserById(params.id, { ban_duration: "none" });
    return NextResponse.json({ ok: true });
  }

  if (action === "reset_password") {
    const newPassword =
      typeof body.new_password === "string" && body.new_password.length >= 8
        ? body.new_password
        : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase() + "!";
    const { error } = await supabase.auth.admin.updateUserById(params.id, { password: newPassword });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, new_password: newPassword });
  }

  return NextResponse.json({ error: "action invalide." }, { status: 400 });
}
