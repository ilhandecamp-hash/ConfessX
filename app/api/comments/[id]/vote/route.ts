import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getFingerprint } from "@/lib/fingerprint";
import { rateLimit } from "@/lib/rate-limit";
import type { CommentVoteType } from "@/types/post";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: CommentVoteType[] = ["funny", "awkward", "serious"];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const fp = getFingerprint(req);
  const rl = rateLimit(`cvote:${fp}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit." }, { status: 429 });

  let body: { type?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const type = body.type as CommentVoteType;
  if (!VALID.includes(type)) {
    return NextResponse.json({ error: "Type invalide." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("increment_comment_vote", {
    p_comment_id: params.id,
    p_vote_type: type,
    p_fingerprint: fp,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, counted: !!data });
}
