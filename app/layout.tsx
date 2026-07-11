import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Les 3 polices de la marque (voir theme_djiguigne.py). Chargées ici une
// seule fois via next/font (auto-hébergées, zéro requête vers Google au
// runtime) et exposées en variables CSS consommées par tailwind.config.ts.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Filet de sécurité si une page échappe au layout [locale] (ne devrait pas
// arriver : app/page.tsx redirige toujours vers /{defaultLocale}).
export const metadata: Metadata = {
  title: "Djiguignè AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
