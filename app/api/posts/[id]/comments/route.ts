import { NextResponse } from "next/server";
import { createAnonServerClient, createServiceClient } from "@/lib/supabase/server";
import { moderate } from "@/lib/moderation";
import { getFingerprint } from "@/lib/fingerprint";
import { hashAuthorToken } from "@/lib/author";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

// GET /api/posts/:id/comments
export async function GET(_req: Request, { params }: Params) {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id,post_id,content,status,funny_count,awkward_count,serious_count,report_count,created_at,updated_at")
    .eq("post_id", params.id)
    .eq("status", "published")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data ?? [] });
}

// POST /api/posts/:id/comments
export async function POST(req: Request, { params }: Params) {
  const fingerprint = getFingerprint(req);
  const rl = rateLimit(`comment:${fingerprint}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit." }, { status: 429 });

  let body: { content?: unknown; device_token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  const deviceToken = typeof body.device_token === "string" ? body.device_token : "";
  if (content.length < 1 || content.length > 500) {
    return NextResponse.json({ error: "Commentaire 1-500 caractères." }, { status: 422 });
  }
  const mod = moderate(content);
  if (!mod.ok) return NextResponse.json({ error: mod.reason || "Invalid." }, { status: 422 });

  const author = hashAuthorToken(deviceToken);

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("add_comment", {
    p_post_id: params.id,
    p_content: content,
    p_author_token: author || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data }, { status: 201 });
}
