import { NextResponse } from "next/server";
import { checkAdminSecret } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

// DELETE /api/admin/users/:id?purge=1
//
// Approche NUCLEAIRE :
//   1. RPC admin_nuke_user (SECURITY DEFINER) → supprime profile + auth.users
//      directement en SQL, ignore soft-delete Supabase.
//   2. Si RPC absente → fallback via admin_force_delete_user + auth.admin.deleteUser(hard).
//   3. Vérification finale : profile absent de la DB.
export async function DELETE(req: Request, { params }: Params) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const purge = url.searchParams.get("purge") === "1";
  const supabase = createServiceClient();
  const id = params.id;

  const debug: Record<string, unknown> = { id, purge };

  // 1) NUKE atomique : profile + auth.users en SQL pur
  const nuke = await supabase.rpc("admin_nuke_user", {
    p_user_id: id,
    p_purge: purge,
  } as never);

  if (nuke.error) {
    debug.nuke_error = nuke.error.message;

    // Fallback : admin_force_delete_user (v7) + auth.admin.deleteUser hard
    const fallback = await supabase.rpc("admin_force_delete_user", {
      p_user_id: id,
      p_purge: purge,
    } as never);
    debug.force_delete_error = fallback.error?.message ?? null;
    debug.force_delete_result = fallback.data ?? null;

    // shouldSoftDelete: false (2e arg) — hard delete explicite
    const authRes = await supabase.auth.admin.deleteUser(id, false);
    debug.auth_error = authRes.error?.message ?? null;
  } else {
    debug.nuke_result = nuke.data;
  }

  // 2) Vérif finale
  const verifyProfile = await supabase
    .from("profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  debug.profile_still_exists = !!verifyProfile.data;

  const verifyAuth = await supabase.auth.admin.getUserById(id).catch(() => null);
  debug.auth_still_exists = !!verifyAuth?.data?.user;

  console.log("[admin DELETE user]", JSON.stringify(debug));

  if (verifyProfile.data) {
    return NextResponse.json(
      {
        error:
          "Le profile persiste malgré la suppression. " +
          "Vérifie : (1) migration_v8.sql exécutée, (2) SUPABASE_SERVICE_ROLE_KEY correcte sur Vercel.",
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
