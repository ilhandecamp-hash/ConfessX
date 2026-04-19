import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewPostForm } from "@/components/NewPostForm";

export const metadata = {
  title: "Nouvelle confession — ConfessX",
};

export default function NewPostPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Nouvelle confession</h1>
        <p className="mt-1 text-sm text-neutral-500">
          C'est 100% anonyme. Aucun compte, aucune trace.
        </p>
      </div>
      <NewPostForm />
    </div>
  );
}
