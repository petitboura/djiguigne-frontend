import type { Metadata } from "next";

// Chantier SEO/AEO (2026-08-01) : zone privée / flow d'auth, aucun
// intérêt SEO -- noindex explicite en plus de l'exclusion dans
// app/robots.ts (défense en profondeur : certains agents ignorent
// robots.txt mais respectent la balise meta robots).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
