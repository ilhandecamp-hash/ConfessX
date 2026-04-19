import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getFingerprint } from "@/lib/fingerprint";
import { rateLimit } from "@/lib/rate-limit";
import type { ReportReason } from "@/types/post";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_REASONS: ReportReason[] = [
  "spam",
  "hate",
  "sexual",
  "illegal",
  "harassment",
  "other",
];

interface Body {
  postId?: unknown;
  commentId?: unknown;
  reason?: unknown;
}

export async function POST(req: Request) {
  const fingerprint = getFingerprint(req);
  const rl = rateLimit(`report:${fingerprint}`, 20, 60_000);
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
  const commentId = typeof body.commentId === "string" ? body.commentId : "";
  const reason =
    typeof body.reason === "string" && VALID_REASONS.includes(body.reason as ReportReason)
      ? (body.reason as ReportReason)
      : null;

  if (!postId && !commentId) {
    return NextResponse.json({ error: "postId ou commentId requis." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = postId
    ? await supabase.rpc("report_post", {
        p_post_id: postId,
        p_fingerprint: fingerprint,
        p_reason: reason,
      })
    : await supabase.rpc("report_comment", {
        p_comment_id: commentId,
        p_fingerprint: fingerprint,
        p_reason: reason,
      });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, counted: !!data });
}
