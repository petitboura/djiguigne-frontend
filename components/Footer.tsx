import Link from "next/link";
import type { Locale } from "@/lib/site-config";
import { siteConfig } from "@/lib/site-config";
import type { getDictionary } from "@/lib/dictionaries";

type Dictionary = ReturnType<typeof getDictionary>;

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-dj-bordure">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="font-display text-base font-bold text-dj-texte">
            Djiguignè <span className="text-dj-accent-1">AI</span>
          </span>
          <p className="mt-2 max-w-xs text-sm text-dj-texte-muet">{dict.footer.location}</p>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <Link href={`/${locale}/legal/mentions-legales`} className="text-dj-texte-muet hover:text-dj-texte">
            {dict.footer.legal}
          </Link>
          <Link href={`/${locale}/legal/confidentialite`} className="text-dj-texte-muet hover:text-dj-texte">
            {dict.footer.privacy}
          </Link>
          <Link href={`/${locale}/legal/cookies`} className="text-dj-texte-muet hover:text-dj-texte">
            {dict.footer.cookies}
          </Link>
          <Link href={`/${locale}/contact`} className="text-dj-texte-muet hover:text-dj-texte">
            {dict.footer.contact}
          </Link>
        </div>
      </div>

      <div className="border-t border-dj-bordure px-5 py-4">
        <p className="mx-auto max-w-5xl font-mono text-xs text-dj-inactif">
          © {year} {siteConfig.brandName} — {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}
