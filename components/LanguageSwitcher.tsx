"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { siteConfig, type Locale } from "@/lib/site-config";

const LABELS: Record<Locale, string> = { fr: "FR", en: "EN" };

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  // app/layout.tsx (racine, hors [locale]) fixe <html lang="fr"> par
  // défaut car il ne connaît pas la locale active. On corrige ici côté
  // client une fois la locale réelle connue — évite d'ajouter un
  // middleware pour un simple attribut d'accessibilité/SEO.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className="flex items-center gap-1 font-mono text-xs">
      {siteConfig.locales.map((l) => {
        const targetPath = swapLocaleInPath(pathname, locale, l);
        const active = l === locale;
        return (
          <Link
            key={l}
            href={targetPath}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-full bg-dj-surface-haute px-2.5 py-1 text-dj-accent-1"
                : "rounded-full px-2.5 py-1 text-dj-texte-muet transition-colors hover:text-dj-texte"
            }
          >
            {LABELS[l]}
          </Link>
        );
      })}
    </div>
  );
}

// Remplace le segment de locale en tête de chemin ("/fr/services" avec
// l="en" -> "/en/services"). Le chemin vient toujours de usePathname donc
// il commence forcément par "/{locale}".
function swapLocaleInPath(pathname: string, current: Locale, next: Locale): string {
  if (next === current) return pathname;
  const rest = pathname.slice(`/${current}`.length);
  return `/${next}${rest}`;
}
