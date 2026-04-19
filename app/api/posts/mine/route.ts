import { NextResponse } from "next/server";
import { createServiceClient, createServerSupabase } from "@/lib/supabase/server";
import { hashAuthorToken } from "@/lib/author";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/posts/mine — liste mes posts (anonymes via device_token + authentifiés via user_id)
export async function GET(req: Request) {
  const token = req.headers.get("x-device-token") || "";
  const author = hashAuthorToken(token);

  const authClient = createServerSupabase();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const userId = user?.id ?? null;

  if (!author && !userId) return NextResponse.json({ posts: [] });

  const supabase = createServiceClient();
  let query = supabase
    .from("posts")
    .select("*, author:profiles(id,username,first_name,last_name,avatar_seed,bio,created_at)")
    .order("created_at", { ascending: false })
    .limit(100);

  // Filtre OR : user_id = me OR author_token = myHash
  if (author && userId) {
    query = query.or(`user_id.eq.${userId},author_token.eq.${author}`);
  } else if (userId) {
    query = query.eq("user_id", userId);
  } else if (author) {
    query = query.eq("author_token", author);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}
