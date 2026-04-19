import { NextResponse } from "next/server";
import { checkAdminSecret } from "@/lib/admin";
import { getFingerprint } from "@/lib/fingerprint";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/auth  { secret }  → { ok: true } si le secret matche
export async function POST(req: Request) {
  const fp = getFingerprint(req);
  const rl = rateLimit(`admin-auth:${fp}`, 10, 60_000); // 10 tentatives / min
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de tentatives." }, { status: 429 });
  }

  let body: { secret?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const secret = typeof body.secret === "string" ? body.secret : "";

  if (!checkAdminSecret(secret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
