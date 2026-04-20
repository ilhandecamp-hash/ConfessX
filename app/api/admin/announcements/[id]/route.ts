import { NextResponse } from "next/server";
import { checkAdminSecret } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

export async function PATCH(req: Request, { params }: Params) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.title === "string") update.title = body.title.trim().slice(0, 100);
  if (typeof body.body === "string") update.body = body.body.trim().slice(0, 2000);
  if (typeof body.active === "boolean") update.active = body.active;
  if (typeof body.dismissible === "boolean") update.dismissible = body.dismissible;
  if (typeof body.type === "string" && ["info", "update", "warning", "event"].includes(body.type)) {
    update.type = body.type;
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("announcements")
    .update(update as never)
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Params) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();
  const { error } = await supabase.from("announcements").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
