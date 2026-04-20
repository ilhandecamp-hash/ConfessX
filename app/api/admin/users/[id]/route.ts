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
// Stratégie robuste avec diagnostics :
// 1. (purge) Delete posts + comments du user
// 2. Delete auth.users → cascade FK supprime profile si encore là
// 3. Delete profile explicitement (au cas où auth.deleteUser a soft-deleted)
// 4. Vérifier que le profile a bien disparu → sinon retourne 500 avec debug
export async function DELETE(req: Request, { params }: Params) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const purge = url.searchParams.get("purge") === "1";
  const supabase = createServiceClient();
  const id = params.id;

  const debug: Record<string, unknown> = { id, purge };

  if (purge) {
    const r = await supabase.from("posts").delete().eq("user_id", id).select("id");
    debug.posts_deleted = r.data?.length ?? 0;
    if (r.error) debug.posts_error = r.error.message;

    const r2 = await supabase.from("comments").delete().eq("user_id", id).select("id");
    debug.comments_deleted = r2.data?.length ?? 0;
    if (r2.error) debug.comments_error = r2.error.message;
  }

  // 1) Delete auth user
  const authRes = await supabase.auth.admin.deleteUser(id);
  debug.auth_error = authRes.error?.message ?? null;
  const authGone = !authRes.error || isAlreadyGoneError(authRes.error.message);

  // 2) Delete profile (au cas où Auth soft-delete ne cascade pas)
  const profileRes = await supabase.from("profiles").delete().eq("id", id).select("id");
  debug.profile_deleted = profileRes.data?.length ?? 0;
  if (profileRes.error) debug.profile_error = profileRes.error.message;

  // 3) Vérif finale
  const verify = await supabase.from("profiles").select("id").eq("id", id).maybeSingle();
  debug.profile_still_exists = !!verify.data;

  console.log("[admin DELETE user]", JSON.stringify(debug));

  if (verify.data) {
    return NextResponse.json(
      {
        error:
          "Le profile persiste en base malgré la suppression. " +
          "Vérifie que SUPABASE_SERVICE_ROLE_KEY sur Vercel est bien la clé 'service_role' (pas le publishable/anon).",
        debug,
      },
      { status: 500 },
    );
  }

  if (!authGone && authRes.error) {
    return NextResponse.json(
      { error: `Auth delete failed: ${authRes.error.message}`, debug },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, purged: purge, debug });
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
