import { Suspense } from "react";
import { SearchClient } from "./search-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recherche — ConfessX",
};

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="py-6 text-center text-sm text-neutral-500">Chargement…</p>}>
      <SearchClient />
    </Suspense>
  );
}
