import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Feed } from "@/components/Feed";
import { CATEGORIES, type Category, type Post } from "@/types/post";
import { createAnonServerClient } from "@/lib/supabase/server";

export const revalidate = 30;

const VALID: Category[] = ["ecole", "amour", "famille", "argent"];

interface Props {
  params: { category: string };
}

export async function generateMetadata({ params }: Props) {
  const cat = CATEGORIES.find((c) => c.id === params.category);
  if (!cat) return { title: "Catégorie — ConfessX" };
  return {
    title: `${cat.emoji} ${cat.label} — ConfessX`,
    description: `Confessions anonymes dans la catégorie ${cat.label}.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  if (!VALID.includes(params.category as Category)) notFound();
  const cat = params.category as Category;
  const meta = CATEGORIES.find((c) => c.id === cat)!;

  const supabase = createAnonServerClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .eq("category", cat)
    .order("trending_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(15);

  return (
    <div className="space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au feed
      </Link>
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <span>{meta.emoji}</span>
          <span>{meta.label}</span>
        </h1>
        <p className="mt-1 text-xs text-neutral-500">
          Toutes les confessions de la catégorie {meta.label.toLowerCase()}.
        </p>
      </div>

      <Feed initialPosts={(data ?? []) as Post[]} forcedCategory={cat} />
    </div>
  );
}
