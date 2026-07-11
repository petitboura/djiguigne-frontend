"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/site-config";
import type { getDictionary } from "@/lib/dictionaries";

type Dictionary = ReturnType<typeof getDictionary>;

const STORAGE_KEY = "dj-cookie-ack";

export function CookieBanner({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // N'affiche le bandeau que si l'utilisateur ne l'a jamais fermé.
    // Purement informatif : aucun cookie de mesure/pub à activer derrière
    // ce bouton (voir Notion section 5 — pas d'analytics à ce jour).
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 animate-dj-fade-up border-t border-dj-bordure bg-dj-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-dj-texte-muet">
          {dict.cookieBanner.text}{" "}
          <Link href={`/${locale}/legal/cookies`} className="text-dj-accent-1 hover:underline">
            {dict.cookieBanner.learnMore}
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full bg-dj-gradient px-4 py-2 text-sm font-bold text-[#1A0D02]"
        >
          {dict.cookieBanner.accept}
        </button>
      </div>
    </div>
  );
}
