import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle2, Flag, Heart, Scale, Shield, XCircle } from "lucide-react";

export const metadata = {
  title: "Règles — ConfessX",
  description: "Règles de la communauté ConfessX.",
};

const DOS = [
  "Partage tes vraies confessions, même les plus gênantes.",
  "Respecte l'anonymat des autres : ne doxx personne.",
  "Utilise les catégories correctement.",
  "Signale ce qui enfreint les règles.",
  "Vote selon ce que tu ressens vraiment.",
];

const DONTS = [
  "Pas de haine (racisme, sexisme, homophobie, etc.).",
  "Pas de harcèlement ni de menaces, même anonymes.",
  "Pas de contenu sexuel non tagué NSFW.",
  "Pas de spam, liens malveillants, pub.",
  "Pas d'infos personnelles identifiantes (nom complet, adresse, etc.).",
  "Pas d'appels au suicide ou incitation à la violence.",
];

export default function RulesPage() {
  return (
    <div className="space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <div>
        <div className="mb-1 flex items-center gap-2">
          <Scale className="h-6 w-6 text-brand" />
          <h1 className="text-2xl font-extrabold tracking-tight">Règles de la communauté</h1>
        </div>
        <p className="text-xs text-neutral-500">Dernière mise à jour : avril 2026</p>
      </div>

      <div className="rounded-2xl border border-brand/30 bg-brand/5 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-brand">
          <Heart className="h-4 w-4" />
          L'esprit de ConfessX
        </div>
        <p className="mt-2 text-sm text-neutral-300">
          On est là pour lâcher ce qu'on n'ose pas dire ailleurs. Pour ça, il faut que chacun se sente
          en sécurité. Les règles ci-dessous ne sont pas là pour casser l'ambiance, mais pour la protéger.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-green-400">
          <CheckCircle2 className="h-4 w-4" />À faire
        </h2>
        <ul className="space-y-2">
          {DOS.map((d) => (
            <li
              key={d}
              className="flex items-start gap-2 rounded-xl border border-border bg-bg-card p-3 text-sm text-neutral-200"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-red-400">
          <XCircle className="h-4 w-4" />
          Interdit
        </h2>
        <ul className="space-y-2">
          {DONTS.map((d) => (
            <li
              key={d}
              className="flex items-start gap-2 rounded-xl border border-border bg-bg-card p-3 text-sm text-neutral-200"
            >
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-100">
          <Shield className="h-4 w-4 text-brand" />
          Modération
        </h2>
        <div className="space-y-2 text-xs text-neutral-400">
          <p className="flex items-start gap-2">
            <Flag className="mt-0.5 h-3 w-3 shrink-0" />
            Un post signalé par <strong className="text-neutral-300">3 utilisateurs</strong> est
            automatiquement masqué en attendant modération.
          </p>
          <p className="flex items-start gap-2">
            <Ban className="mt-0.5 h-3 w-3 shrink-0" />
            Les comptes qui enfreignent les règles de façon répétée sont bannis.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-bg-card p-4">
        <h2 className="mb-2 text-sm font-bold text-neutral-100">En cas d'urgence</h2>
        <p className="text-xs text-neutral-400">
          Si toi ou quelqu'un que tu connais êtes en détresse : <strong>3114</strong> (numéro national
          prévention suicide, France, 24/7, gratuit).
        </p>
      </section>
    </div>
  );
}
