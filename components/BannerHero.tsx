import Image from "next/image";

// Bannière affichée en haut de la home, masquée une fois qu'on a scrollé.
// On l'enveloppe dans un bg doux pour que le violet ressorte sur le dark.
export function BannerHero() {
  return (
    <div className="-mx-4 mb-2 overflow-hidden">
      <div className="relative mx-auto rounded-3xl bg-gradient-to-br from-white to-neutral-200 p-3 shadow-[0_0_40px_rgba(58,43,122,0.15)]">
        <Image
          src="/banner.png"
          alt="ConfessX — Le site de confessions anonymes"
          width={1200}
          height={520}
          priority
          className="h-auto w-full object-contain"
        />
      </div>
    </div>
  );
}
