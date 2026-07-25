"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { NotificationsCloche } from "@/components/NotificationsCloche";
import { NotificationsPushCloche } from "@/components/NotificationsPushCloche";
import { BoutonInstaller } from "@/components/BoutonInstaller";

// Nav de la PLATEFORME, volontairement différente du Header de
// djiguigne-frontend (pas de services/about/blog/contact). "Mon espace" pointe vers
// /dashboard, pas encore construit (Étape D.5) : le lien existe déjà pour
// ne pas avoir à retoucher ce composant plus tard, Next.js affichera son
// 404 par défaut tant que la page n'existe pas.
export function TopBar() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const pathname = usePathname();
  // Corrigé le 2026-07-13 (Bourama : "'Mon espace' reste éteint même
  // quand on est dedans") : aucun état actif n'était géré, le lien
  // gardait la même apparence peu importe la page courante.
  const dansMonEspace = pathname?.startsWith("/dashboard");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user.email ?? null);
    });
    const { data: ecoute } = supabase.auth.onAuthStateChange((_evenement, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => ecoute.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-dj-bordure bg-dj-fond/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Djiguignè AI" width={30} height={30} priority />
          <span className="font-display text-base font-bold tracking-tight text-dj-texte">
            Djiguignè <span className="text-dj-accent-1">AI</span>
          </span>
        </Link>

        {/* undefined = session pas encore vérifiée : on n'affiche rien
            plutôt qu'un état qui clignote (connecté -> déconnecté) le
            temps que Supabase réponde. */}
        {email === undefined ? null : email ? (
          <div className="flex items-center gap-3">
            <BoutonInstaller />
            <NotificationsCloche />
            <NotificationsPushCloche />
            <Link
              href="/dashboard"
              className={
                dansMonEspace
                  ? "rounded-full bg-dj-gradient px-4 py-2 text-sm font-bold text-[#1A0D02]"
                  : "rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
              }
            >
              Mon espace
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <BoutonInstaller />
            <Link
              href="/inscription"
              className="flex items-center gap-1.5 rounded-full bg-dj-gradient px-4 py-2 text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5"
            >
              <span aria-hidden="true">+</span>
              Créer mon IA
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
