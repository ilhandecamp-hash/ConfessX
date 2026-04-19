"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl">💥</p>
      <h1 className="mt-4 text-xl font-extrabold">Oups, quelque chose a cassé.</h1>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-brand px-5 py-2 text-sm font-bold text-white"
      >
        Réessayer
      </button>
    </div>
  );
}
