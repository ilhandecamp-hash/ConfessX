import { NextResponse } from "next/server";
import {
  createServiceClient,
  createAnonServerClient,
  createServerSupabase,
} from "@/lib/supabase/server";
import { hashAuthorToken } from "@/lib/author";
import { getFingerprint } from "@/lib/fingerprint";
import { rateLimit } from "@/lib/rate-limit";
import { moderate } from "@/lib/moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

export async function GET(_req: Request, { params }: Params) {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*, author:profiles(id,username,first_name,last_name,avatar_seed,bio,created_at)")
    .eq("id", params.id)
    .eq("status", "published")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ post: data });
}

export async function DELETE(req: Request, { params }: Params) {
  const fingerprint = getFingerprint(req);
  const rl = rateLimit(`delete:${fingerprint}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit." }, { status: 429 });

  const token = req.headers.get("x-device-token") || "";
  const author = hashAuthorToken(token);

  const authClient = createServerSupabase();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const userId = user?.id ?? null;

  if (!author && !userId) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("delete_post", {
    p_post_id: params.id,
    p_author_token: author || "",
    p_user_id: userId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: Params) {
  const fingerprint = getFingerprint(req);
  const rl = rateLimit(`edit:${fingerprint}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit." }, { status: 429 });

  const token = req.headers.get("x-device-token") || "";
  const author = hashAuthorToken(token);

  const authClient = createServerSupabase();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const userId = user?.id ?? null;

  if (!author && !userId) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: { content?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const mod = moderate(content);
  if (!mod.ok) return NextResponse.json({ error: mod.reason || "Invalid." }, { status: 422 });

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("update_post", {
    p_post_id: params.id,
    p_author_token: author || "",
    p_content: content,
    p_user_id: userId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    return NextResponse.json(
      { error: "Édition impossible (non auteur ou fenêtre de 5 min expirée)." },
      { status: 403 },
    );
  }
  return NextResponse.json({ ok: true });
}
