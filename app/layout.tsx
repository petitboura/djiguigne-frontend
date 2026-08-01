import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

// Correctif mobile (2026-07-30, demande Bourama) : viewportFit "cover" +
// interactiveWidget "resizes-content" -- sur Android/Chrome récents, ça
// force le navigateur à redimensionner le layout viewport (pas juste le
// visual viewport) quand le clavier virtuel s'ouvre, donc les conteneurs
// en h-dvh (voir ChatAgentClient.tsx) rétrécissent correctement au lieu de
// laisser la barre de saisie glisser sous le clavier. "cover" est
// nécessaire pour que les paddings env(safe-area-inset-*) (encoche/barre
// d'accueil iOS) prennent effet.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

// Étape D.1 (pivot social) : les 3 polices de la marque, chargées ici à
// l'identique de djiguigne-frontend/app/layout.tsx (next/font, auto-
// hébergées, zéro requête Google au runtime), exposées en variables CSS
// consommées par tailwind.config.ts.
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

export const metadata: Metadata = {
  // Chantier SEO/AEO (2026-08-01) : requis pour que Next.js résolve les
  // URLs relatives (images OG, canonical) en URLs absolues correctes,
  // au lieu de tomber sur localhost en prod. Piloté par variable
  // d'environnement pour ne rien casser si l'app change d'hébergement.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://djiguigne.vercel.app"),
  title: "Djiguignè AI",
  description: "Crée ton propre assistant IA, sans coder.",
  // PWA (Bourama, 2026-07-15) : installable sans Play Store/App Store.
  // Le manifest lui-même vient de app/manifest.ts, généré et lié
  // automatiquement par Next.js -- ces 2 champs couvrent ce que le
  // manifest ne fait pas : l'icône iOS (Safari ignore le manifest pour
  // ça) et le mode "Ajouter à l'écran d'accueil" côté Apple.
  icons: { apple: "/icone-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Djiguignè" },
};

export default function RacineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${bricolage.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-dj-fond font-sans text-dj-texte antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
// force-redeploy 2026-07-13
