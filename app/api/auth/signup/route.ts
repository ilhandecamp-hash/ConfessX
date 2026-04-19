import { NextResponse } from "next/server";
import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";
import { getFingerprint } from "@/lib/fingerprint";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USERNAME_RX = /^[a-zA-Z0-9_.-]{3,20}$/;

interface Body {
  username?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  password?: unknown;
  email?: unknown;
}

export async function POST(req: Request) {
  const fp = getFingerprint(req);
  const rl = rateLimit(`signup:${fp}`, 5, 5 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Trop de tentatives." }, { status: 429 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const first_name = typeof body.first_name === "string" ? body.first_name.trim() : "";
  const last_name = typeof body.last_name === "string" ? body.last_name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const emailProvided = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!USERNAME_RX.test(username)) {
    return NextResponse.json(
      { error: "Nom d'utilisateur invalide (3-20 caractères, lettres/chiffres/._-)." },
      { status: 422 },
    );
  }
  if (first_name.length < 1 || first_name.length > 40) {
    return NextResponse.json({ error: "Prénom invalide." }, { status: 422 });
  }
  if (last_name.length < 1 || last_name.length > 40) {
    return NextResponse.json({ error: "Nom invalide." }, { status: 422 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Mot de passe : 8 caractères minimum." }, { status: 422 });
  }
  if (emailProvided && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailProvided)) {
    return NextResponse.json({ error: "Email invalide." }, { status: 422 });
  }

  const service = createServiceClient();

  // Check username unique
  const { data: available, error: availErr } = await service.rpc("username_available", {
    p_username: username,
  });
  if (availErr) return NextResponse.json({ error: availErr.message }, { status: 500 });
  if (!available) return NextResponse.json({ error: "Nom d'utilisateur déjà pris." }, { status: 409 });

  // Email synthétique si non fourni
  const email = emailProvided || `${username}-${crypto.randomUUID().slice(0, 8)}@confessx.app`;

  // Créer l'user via service role (bypass email confirmation)
  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, first_name, last_name },
  });
  if (createErr || !created.user) {
    const msg = createErr?.message || "Erreur de création.";
    const status = msg.toLowerCase().includes("already") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }

  // Créer le profile (INSERT via service role — contourne create_profile qui dépend d'auth.uid())
  const { error: profileErr } = await service.from("profiles").insert({
    id: created.user.id,
    username,
    first_name,
    last_name,
  });
  if (profileErr) {
    await service.auth.admin.deleteUser(created.user.id); // rollback
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  // Signer l'utilisateur (crée les cookies de session)
  const supabase = createServerSupabase();
  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signErr) {
    return NextResponse.json({ error: signErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, username });
}
