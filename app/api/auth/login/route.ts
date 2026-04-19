import { NextResponse } from "next/server";
import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";
import { getFingerprint } from "@/lib/fingerprint";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  identifier?: unknown; // username ou email
  password?: unknown;
}

export async function POST(req: Request) {
  const fp = getFingerprint(req);
  const rl = rateLimit(`login:${fp}`, 10, 5 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Trop de tentatives." }, { status: 429 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const rawId = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!rawId || !password) {
    return NextResponse.json({ error: "Identifiants requis." }, { status: 422 });
  }

  // Si ça ressemble à un email → directement, sinon lookup username → email
  let email = rawId;
  if (!rawId.includes("@")) {
    const service = createServiceClient();
    const { data } = await service
      .from("profiles")
      .select("id")
      .eq("username", rawId.toLowerCase())
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }
    // Récupère l'email via admin API
    const { data: userData, error: userErr } = await service.auth.admin.getUserById(data.id);
    if (userErr || !userData.user?.email) {
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }
    email = userData.user.email;
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
