import { NextResponse } from "next/server";
import { checkAdminSecret } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/diag/:id → état brut d'un user côté DB + auth.
// Utile pour comprendre pourquoi un profile persiste après suppression.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const id = params.id;

  const [profile, posts, comments, authUser] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase.auth.admin.getUserById(id).catch((e) => ({ data: { user: null }, error: e })),
  ]);

  const res = NextResponse.json({
    id,
    profile_exists: !!profile.data,
    profile: profile.data,
    profile_error: profile.error?.message ?? null,
    posts_count: posts.count ?? 0,
    comments_count: comments.count ?? 0,
    auth_user_exists: !!authUser.data?.user,
    auth_user: authUser.data?.user
      ? {
          id: authUser.data.user.id,
          email: authUser.data.user.email,
          created_at: authUser.data.user.created_at,
          banned_until: authUser.data.user.banned_until,
          deleted_at: (authUser.data.user as unknown as { deleted_at?: string }).deleted_at,
        }
      : null,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
