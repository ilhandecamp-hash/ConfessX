import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getFingerprint } from "@/lib/fingerprint";
import { rateLimit } from "@/lib/rate-limit";
import type { VoteType } from "@/types/post";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: VoteType[] = ["funny", "awkward", "serious", "yes", "no"];

interface Body {
  postId?: unknown;
  type?: unknown;
}

export async function POST(req: Request) {
  const fingerprint = getFingerprint(req);
  const rl = rateLimit(`vote:${fingerprint}`, 60, 60_000); // 60 votes / min
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limit." }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const postId = typeof body.postId === "string" ? body.postId : "";
  const type = body.type as VoteType;

  if (!postId || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("increment_vote", {
    p_post_id: postId,
    p_vote_type: type,
    p_fingerprint: fingerprint,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, counted: !!data });
}
