import { NextResponse } from "next/server";
import { checkAdminSecret } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

function isAlreadyGoneError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("not found") ||
    lower.includes("does not exist") ||
    lower.includes("user_not_found") ||
    lower.includes("no rows")
  );
}

// DELETE /api/admin/users/:id?purge=1
//
// Séquence atomique garantie :
//   1. RPC admin_force_delete_user (SECURITY DEFINER, bypass RLS) → supprime
//      profile + éventuellement posts/comments, retourne compteurs exacts.
//   2. auth.admin.deleteUser → retire la row dans auth.users (+ sessions).
//   3. Vérification SELECT : le profile doit être absent après.
export async function DELETE(req: Request, { params }: Params) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const purge = url.searchParams.get("purge") === "1";
  const supabase = createServiceClient();
  const id = params.id;

  const debug: Record<string, unknown> = { id, purge };

  // 1) RPC atomique (SECURITY DEFINER)
  const rpcRes = await supabase.rpc("admin_force_delete_user", {
    p_user_id: id,
    p_purge: purge,
  } as never);
  if (rpcRes.error) {
    debug.rpc_error = rpcRes.error.message;
    // Fallback : delete direct via service role
    if (purge) {
      const p = await supabase.from("posts").delete().eq("user_id", id).select("id");
      debug.posts_deleted_fallback = p.data?.length ?? 0;
      if (p.error) debug.posts_error = p.error.message;
      const c = await supabase.from("comments").delete().eq("user_id", id).select("id");
      debug.comments_deleted_fallback = c.data?.length ?? 0;
      if (c.error) debug.comments_error = c.error.message;
    }
    const prof = await supabase.from("profiles").delete().eq("id", id).select("id");
    debug.profile_deleted_fallback = prof.data?.length ?? 0;
    if (prof.error) debug.profile_error = prof.error.message;
  } else {
    debug.rpc_result = rpcRes.data;
  }

  // 2) Delete auth user
  const authRes = await supabase.auth.admin.deleteUser(id);
  debug.auth_error = authRes.error?.message ?? null;
  const authGone = !authRes.error || isAlreadyGoneError(authRes.error.message);

  // 3) Vérif finale (avec cache-busting via pas de cache Supabase)
  const verify = await supabase.from("profiles").select("id").eq("id", id).maybeSingle();
  debug.profile_still_exists = !!verify.data;

  console.log("[admin DELETE user]", JSON.stringify(debug));

  if (verify.data) {
    return NextResponse.json(
      {
        error:
          "Le profile persiste malgré la suppression. La RPC 'admin_force_delete_user' existe-t-elle ? As-tu exécuté migration_v7.sql ? Sinon vérifie SUPABASE_SERVICE_ROLE_KEY sur Vercel.",
        debug,
      },
      { status: 500 },
    );
  }

  if (!authGone && authRes.error) {
    return NextResponse.json(
      {
        error: `Profile supprimé mais delete auth.users a échoué : ${authRes.error.message}`,
        debug,
      },
      { status: 500 },
    );
  }

  const res = NextResponse.json({ ok: true, purged: purge, debug });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

// PATCH /api/admin/users/:id  { action: 'ban'|'unban'|'reset_password' }
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
