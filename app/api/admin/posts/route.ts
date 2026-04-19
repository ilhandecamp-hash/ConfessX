import { NextResponse } from "next/server";
import { checkAdminSecret } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/posts?scope=pending|reported|all → liste pour modération
export async function GET(req: Request) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "reported";

  const supabase = createServiceClient();
  let query = supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(100);

  if (scope === "pending") query = query.eq("status", "pending");
  else if (scope === "reported") query = query.gt("report_count", 0);
  // scope === 'all' : rien à ajouter

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

// DELETE /api/admin/posts?scope=all|pending|comments|reset_counters
export async function DELETE(req: Request) {
  if (!checkAdminSecret(req.headers.get("x-admin-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "";
  const supabase = createServiceClient();

  switch (scope) {
    case "all": {
      // Supprime tous les posts (CASCADE → votes, comments, reports)
      const { error } = await supabase
        .from("posts")
        .delete()
        .gte("created_at", "1970-01-01"); // WHERE always true (Supabase n'autorise pas delete sans filtre)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Tous les posts supprimés." });
    }

    case "pending": {
      const { error } = await supabase.from("posts").delete().eq("status", "pending");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Posts en attente supprimés." });
    }

    case "comments": {
      const { error } = await supabase
        .from("comments")
        .delete()
        .gte("created_at", "1970-01-01");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, message: "Tous les commentaires supprimés." });
    }

    case "reset_counters": {
      const { error } = await supabase
        .from("posts")
        .update({
          funny_count: 0,
          awkward_count: 0,
          serious_count: 0,
          yes_count: 0,
          no_count: 0,
          report_count: 0,
          view_count: 0,
          trending_score: 0,
          is_highlight: false,
        })
        .gte("created_at", "1970-01-01");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supabase.from("votes").delete().gte("created_at", "1970-01-01");
      await supabase.from("reports").delete().gte("created_at", "1970-01-01");
      return NextResponse.json({ ok: true, message: "Compteurs réinitialisés." });
    }

    default:
      return NextResponse.json({ error: "scope invalide." }, { status: 400 });
  }
}
