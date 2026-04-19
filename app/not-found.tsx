import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl">👀</p>
      <h1 className="mt-4 text-xl font-extrabold">Page introuvable</h1>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-brand px-5 py-2 text-sm font-bold text-white"
      >
        Retour au feed
      </Link>
    </div>
  );
}
