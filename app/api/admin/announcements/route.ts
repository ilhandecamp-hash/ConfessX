import { NextResponse } from "next/server";
import { checkAdminSecret } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import type { AnnouncementType } from "@/types/post";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: AnnouncementType[] = ["info", "update", "warning", "event"];

// GET /api/admin/announcements → toutes (actives + inactives)
export async function GET(req: Request) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcements: data ?? [] });
}

// POST /api/admin/announcements → crée une annonce
export async function POST(req: Request) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    title?: unknown;
    body?: unknown;
    type?: unknown;
    active?: unknown;
    dismissible?: unknown;
    expires_at?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const type = VALID_TYPES.includes(body.type as AnnouncementType)
    ? (body.type as AnnouncementType)
    : "info";
  const active = body.active !== false;
  const dismissible = body.dismissible !== false;
  const expires_at =
    typeof body.expires_at === "string" && body.expires_at.length > 0
      ? body.expires_at
      : null;

  if (title.length < 1 || title.length > 100) {
    return NextResponse.json({ error: "Titre 1-100 caractères." }, { status: 422 });
  }
  if (text.length < 1 || text.length > 2000) {
    return NextResponse.json({ error: "Description 1-2000 caractères." }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("announcements")
    .insert({ title, body: text, type, active, dismissible, expires_at } as never)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcement: data }, { status: 201 });
}
