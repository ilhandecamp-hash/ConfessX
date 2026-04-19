import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ConfessX — Lâche ton secret, anonymement.",
  description:
    "Confessions 100% anonymes. Dis ce que tu n'oses pas dire, vote sur celles des autres, partage le drama.",
  applicationName: "ConfessX",
  openGraph: {
    title: "ConfessX",
    description: "Confessions anonymes. Drôle, Gênant, Grave — ou juge : en tort ou pas ?",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ConfessX",
    description: "Confessions 100% anonymes.",
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-bg text-neutral-100">
        <Header />
        <main className="mx-auto w-full max-w-xl px-4 py-4 pb-20">{children}</main>
      </body>
    </html>
  );
}
