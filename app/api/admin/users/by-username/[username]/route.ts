import { NextResponse } from "next/server";
import { checkAdminSecret } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/admin/users/by-username/:username?purge=1
// Résout le username en id FRAIS (pas basé sur une liste cachée), puis nuke.
// En boucle : tant qu'il y a un profile avec ce username, on le tape.
export async function DELETE(req: Request, { params }: { params: { username: string } }) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const purge = url.searchParams.get("purge") === "1";
  const username = params.username.toLowerCase();

  const supabase = createServiceClient();

  const log: unknown[] = [];
  for (let i = 0; i < 5; i++) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .limit(5);

    if (!profiles || profiles.length === 0) break;

    for (const p of profiles) {
      const nuke = await supabase.rpc("admin_nuke_user", {
        p_user_id: p.id,
        p_purge: purge,
      } as never);
      log.push({ attempt: i + 1, id: p.id, result: nuke.data, error: nuke.error?.message });
    }
  }

  // Vérif finale
  const { data: remaining } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .limit(5);

  return NextResponse.json({
    ok: !remaining || remaining.length === 0,
    username,
    log,
    remaining: remaining ?? [],
  });
}
