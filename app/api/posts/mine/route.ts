import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { hashAuthorToken } from "@/lib/author";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/posts/mine — liste des posts de ce device
// Passe x-device-token en header.
export async function GET(req: Request) {
  const token = req.headers.get("x-device-token") || "";
  const author = hashAuthorToken(token);
  if (!author) return NextResponse.json({ posts: [] });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("author_token", author)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}
