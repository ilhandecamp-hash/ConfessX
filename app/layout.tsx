import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/Header";
import { ScrollToTop } from "@/components/ScrollToTop";
import { OwnershipProvider } from "@/contexts/OwnershipContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { getCurrentUser } from "@/lib/supabase/server";
import type { Profile } from "@/types/post";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ConfessX — Le site de confessions anonymes.",
  description:
    "Confessions 100% anonymes. Dis ce que tu n'oses pas dire, vote sur celles des autres, partage le drama.",
  applicationName: "ConfessX",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "ConfessX",
    description: "Le site de confessions anonymes — drôle, gênant, grave.",
    type: "website",
    images: [{ url: "/banner.png", width: 1200, height: 520, alt: "ConfessX" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ConfessX",
    description: "Le site de confessions anonymes.",
    images: ["/banner.png"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const auth = await getCurrentUser();
  const initialUserId = auth?.user?.id ?? null;
  const initialProfile = (auth?.profile as Profile | null) ?? null;

  return (
    <html lang="fr" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-bg text-neutral-100">
        <AuthProvider initialUserId={initialUserId} initialProfile={initialProfile}>
          <OwnershipProvider>
            <Header />
            <main className="mx-auto w-full max-w-xl px-4 py-4 pb-20">{children}</main>
            <ScrollToTop />
          </OwnershipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
