import { NextResponse } from "next/server";
import {
  createServiceClient,
  createAnonServerClient,
  createServerSupabase,
} from "@/lib/supabase/server";
import { moderate } from "@/lib/moderation";
import { getFingerprint } from "@/lib/fingerprint";
import { hashAuthorToken } from "@/lib/author";
import { rateLimit } from "@/lib/rate-limit";
import type { Category, PostMode, Post, TimeRange } from "@/types/post";

async function getFilters(): Promise<{
  blockedIds: Set<string>;
  hiddenPosts: Set<string>;
  followingIds: Set<string>;
}> {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { blockedIds: new Set(), hiddenPosts: new Set(), followingIds: new Set() };
  }
  const [blocksRes, hiddenRes, followsRes] = await Promise.all([
    supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
    supabase.from("hidden_posts").select("post_id").eq("user_id", user.id),
    supabase.from("follows").select("followed_id").eq("follower_id", user.id),
  ]);
  const blocks = (blocksRes.data ?? []) as Array<{ blocked_id: string }>;
  const hidden = (hiddenRes.data ?? []) as Array<{ post_id: string }>;
  const follows = (followsRes.data ?? []) as Array<{ followed_id: string }>;
  return {
    blockedIds: new Set(blocks.map((b) => b.blocked_id)),
    hiddenPosts: new Set(hidden.map((h) => h.post_id)),
    followingIds: new Set(follows.map((f) => f.followed_id)),
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------- GET /api/posts ----------
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tab = (url.searchParams.get("tab") || "trending") as "trending" | "recent" | "following";
  const range = (url.searchParams.get("range") || "all") as TimeRange;
  const category = url.searchParams.get("category") as Category | null;
  const idsParam = url.searchParams.get("ids");
  const userIdParam = url.searchParams.get("user_id");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "15", 10)));
  const offset = (page - 1) * limit;

  // We fetch a bit more than limit to allow post-filter without losing items
  const fetchLimit = Math.min(100, limit * 3);

  const supabase = createAnonServerClient();
  const { blockedIds, hiddenPosts, followingIds } = await getFilters();

  let query = supabase
    .from("posts")
    .select("*, author:profiles(id,username,first_name,last_name,avatar_seed,bio,created_at)")
    .eq("status", "published");

  if (idsParam) {
    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);
    if (ids.length === 0) return NextResponse.json({ posts: [] });
    query = query.in("id", ids);
  }
  if (userIdParam) query = query.eq("user_id", userIdParam);
  if (category && ["ecole", "amour", "famille", "argent"].includes(category)) {
    query = query.eq("category", category);
  }
  if (tab === "following") {
    if (followingIds.size === 0) return NextResponse.json({ posts: [] });
    query = query.in("user_id", Array.from(followingIds));
  }
  if (range !== "all") {
    const hours = range === "day" ? 24 : 24 * 7;
    const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    query = query.gte("created_at", cutoff);
  }

  query = query.range(offset, offset + fetchLimit - 1);

  if (tab === "trending") {
    query = query
      .order("hot_score", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Post-filter: remove blocked users + hidden posts
  const filtered = (data ?? [])
    .filter((p) => !p.user_id || !blockedIds.has(p.user_id))
    .filter((p) => !hiddenPosts.has(p.id))
    .slice(0, limit);

  return NextResponse.json({ posts: filtered as unknown as Post[] });
}

// ---------- POST /api/posts ----------
interface CreateBody {
  content?: unknown;
  category?: unknown;
  mode?: unknown;
  nsfw?: unknown;
  anonymous?: unknown;
  device_token?: unknown;
}

export async function POST(req: Request) {
  const fingerprint = getFingerprint(req);
  const rl = rateLimit(`create:${fingerprint}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de posts en peu de temps. Respire un peu." },
      { status: 429 },
    );
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  const category = body.category as Category;
  const mode = body.mode as PostMode;
  const nsfw = body.nsfw === true;
  const anonymous = body.anonymous !== false; // défaut : anonyme si non spécifié
  const deviceToken = typeof body.device_token === "string" ? body.device_token : "";

  const validCategory = ["ecole", "amour", "famille", "argent"].includes(category);
  const validMode = ["confession", "judgment"].includes(mode);

  if (!validCategory || !validMode) {
    return NextResponse.json({ error: "Catégorie ou mode invalide." }, { status: 400 });
  }

  const mod = moderate(content);
  if (!mod.ok) {
    return NextResponse.json({ error: mod.reason || "Contenu invalide." }, { status: 422 });
  }

  // Si l'utilisateur est connecté ET qu'il ne veut pas être anonyme → on attache user_id
  let userId: string | null = null;
  if (!anonymous) {
    const supa = createServerSupabase();
    const {
      data: { user },
    } = await supa.auth.getUser();
    if (user) userId = user.id;
  }

  const author_token = userId ? null : hashAuthorToken(deviceToken);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      content,
      category,
      mode,
      nsfw,
      status: "published",
      author_token: author_token || null,
      user_id: userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Erreur insertion." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
