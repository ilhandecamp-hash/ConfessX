import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { hashAuthorToken } from "@/lib/author";
import { getFingerprint } from "@/lib/fingerprint";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

// DELETE /api/comments/:id — auteur seulement
export async function DELETE(req: Request, { params }: Params) {
  const fp = getFingerprint(req);
  const rl = rateLimit(`del-comment:${fp}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit." }, { status: 429 });

  const token = req.headers.get("x-device-token") || "";
  const author = hashAuthorToken(token);
  if (!author) return NextResponse.json({ error: "Missing device token." }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("delete_comment", {
    p_comment_id: params.id,
    p_author_token: author,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
