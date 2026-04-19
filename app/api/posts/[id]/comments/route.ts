import { NextResponse } from "next/server";
import {
  createAnonServerClient,
  createServiceClient,
  createServerSupabase,
} from "@/lib/supabase/server";
import { moderate } from "@/lib/moderation";
import { getFingerprint } from "@/lib/fingerprint";
import { hashAuthorToken } from "@/lib/author";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

// GET /api/posts/:id/comments?sort=top|new
export async function GET(req: Request, { params }: Params) {
  const url = new URL(req.url);
  const sort = url.searchParams.get("sort") || "new";

  const supabase = createAnonServerClient();
  let query = supabase
    .from("comments")
    .select("id,post_id,parent_id,content,status,funny_count,awkward_count,serious_count,report_count,user_id,created_at,updated_at, author:profiles(id,username,first_name,last_name,avatar_seed,bio,created_at)")
    .eq("post_id", params.id)
    .eq("status", "published")
    .limit(500);

  if (sort === "top") {
    query = query
      .order("serious_count", { ascending: false })
      .order("awkward_count", { ascending: false })
      .order("funny_count", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: true });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data ?? [] });
}

// POST /api/posts/:id/comments
export async function POST(req: Request, { params }: Params) {
  const fingerprint = getFingerprint(req);
  const rl = rateLimit(`comment:${fingerprint}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit." }, { status: 429 });

  let body: {
    content?: unknown;
    device_token?: unknown;
    parent_id?: unknown;
    anonymous?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  const deviceToken = typeof body.device_token === "string" ? body.device_token : "";
  const parentId =
    typeof body.parent_id === "string" && body.parent_id.length > 0 ? body.parent_id : null;
  const anonymous = body.anonymous !== false; // défaut : anonyme

  if (content.length < 1 || content.length > 500) {
    return NextResponse.json({ error: "Commentaire 1-500 caractères." }, { status: 422 });
  }
  const mod = moderate(content);
  if (!mod.ok) return NextResponse.json({ error: mod.reason || "Invalid." }, { status: 422 });

  let userId: string | null = null;
  if (!anonymous) {
    const authClient = createServerSupabase();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (user) userId = user.id;
  }

  const author = userId ? null : hashAuthorToken(deviceToken);

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("add_comment", {
    p_post_id: params.id,
    p_content: content,
    p_author_token: author || null,
    p_parent_id: parentId,
    p_user_id: userId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data }, { status: 201 });
}
