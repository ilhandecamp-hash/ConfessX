import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getFingerprint } from "@/lib/fingerprint";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/posts/:id/view — incrémente la vue (best-effort, pas critique)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const fp = getFingerprint(req);
  // 1 vue comptée par post toutes les 5 min par device (simple anti-abuse)
  const rl = rateLimit(`view:${fp}:${params.id}`, 1, 5 * 60_000);
  if (!rl.ok) return NextResponse.json({ ok: true, counted: false });

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("increment_view", { p_post_id: params.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, counted: true });
}
