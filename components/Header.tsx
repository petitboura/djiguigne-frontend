"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { siteConfig, type Locale } from "@/lib/site-config";
import type { getDictionary } from "@/lib/dictionaries";
import { LanguageSwitcher } from "./LanguageSwitcher";

type Dictionary = ReturnType<typeof getDictionary>;

const LINKS = (locale: Locale, nav: Dictionary["nav"]) => [
  { href: `/${locale}`, label: nav.home },
  { href: `/${locale}/services`, label: nav.services },
  { href: `/${locale}/about`, label: nav.about },
  { href: `/${locale}/blog`, label: nav.blog },
  { href: `/${locale}/contact`, label: nav.contact },
];

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [open, setOpen] = useState(false);
  const links = LINKS(locale, dict.nav);

  return (
    <header className="sticky top-0 z-50 border-b border-dj-bordure bg-dj-fond/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href={`/${locale}`} className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Image src="/logo.png" alt="Djiguignè AI" width={32} height={32} priority />
          <span className="font-display text-lg font-bold tracking-tight text-dj-texte">
            Djiguignè <span className="text-dj-accent-1">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-dj-texte-muet transition-colors hover:text-dj-texte"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <LanguageSwitcher locale={locale} />
          <Link
            href={siteConfig.appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-dj-gradient px-4 py-2 text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5"
          >
            {dict.nav.cta}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-dj-bordure text-dj-texte md:hidden"
        >
          <span className="sr-only">Menu</span>
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-dj-bordure px-5 py-4 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-2.5 text-sm text-dj-texte-muet hover:bg-dj-surface hover:text-dj-texte"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between px-2">
            <LanguageSwitcher locale={locale} />
            <Link
              href={siteConfig.appUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="rounded-full bg-dj-gradient px-4 py-2 text-sm font-bold text-[#1A0D02]"
            >
              {dict.nav.cta}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
