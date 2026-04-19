import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl">🤐</p>
      <h1 className="mt-4 text-xl font-extrabold">Confession introuvable</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Elle a peut-être été signalée ou supprimée.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-brand px-5 py-2 text-sm font-bold text-white"
      >
        Retour au feed
      </Link>
    </div>
  );
}
