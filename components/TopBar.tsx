"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { appelerApi } from "@/lib/api";
import { NotificationsCloche } from "@/components/NotificationsCloche";
import { NotificationsPushCloche } from "@/components/NotificationsPushCloche";
import { BoutonInstaller } from "@/components/BoutonInstaller";

// Nav de la PLATEFORME, volontairement différente du Header de
// djiguigne-frontend (pas de services/about/blog/contact).
//
// "Mon espace" pointe vers /dashboard/espace depuis le 01/08 (demande
// Bourama : nouvelle page -- Historique + Bibliothèque + Appli
// connectées -- remplace l'ancienne /dashboard dans la navigation.
// L'ancienne page /dashboard N'EST PAS supprimée ("ne le supprime pas,
// juste désactive-le"), juste retirée d'ici et de SidebarChat.tsx ;
// reste joignable par lien direct pour qui a l'URL.
//
// MISE À JOUR 2026-08-05 (tâche F) : "Mon espace" devient sensible au
// rôle -- un établissement/enseignant/étudiant est envoyé vers
// /dashboard/espace-role (onglets Mon IA + Contacts) au lieu de
// /dashboard/espace (Bibliothèque/Mémoire/Historique, réservé aux
// créateurs standard). Un compte sans rôle (role === null, la grande
// majorité) garde le comportement inchangé.
export function TopBar() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [monRole, setMonRole] = useState<string | null>(null);
  const pathname = usePathname();
  // Corrigé le 2026-07-13 (Bourama : "'Mon espace' reste éteint même
  // quand on est dedans") : aucun état actif n'était géré, le lien
  // gardait la même apparence peu importe la page courante. Toujours
  // large (tout /dashboard/*, pas juste /dashboard/espace) : les autres
  // pages du dashboard (applications, modifier un agent...) restent
  // sous cette même rubrique de nav.
  const dansMonEspace = pathname?.startsWith("/dashboard");
  const lienMonEspace = monRole ? "/dashboard/espace-role" : "/dashboard/espace";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user.email ?? null);
    });
    const { data: ecoute } = supabase.auth.onAuthStateChange((_evenement, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => ecoute.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!email) {
      setMonRole(null);
      return;
    }
    // Best-effort : un échec (pas de session encore prête côté API, etc.)
    // laisse simplement le lien sur son comportement par défaut.
    appelerApi("/api/roles/moi")
      .then((r: { role: string | null }) => setMonRole(r.role))
      .catch(() => setMonRole(null));
  }, [email]);

  return (
    <header className="sticky top-0 z-50 border-b border-dj-bordure bg-dj-fond/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Djiguignè AI" width={30} height={30} priority />
          <span className="hidden font-display text-base font-bold tracking-tight text-dj-texte sm:inline">
            Djiguignè <span className="text-dj-accent-1">AI</span>
          </span>
        </Link>

        {/* undefined = session pas encore vérifiée : on n'affiche rien
            plutôt qu'un état qui clignote (connecté -> déconnecté) le
            temps que Supabase réponde. */}
        {email === undefined ? null : email ? (
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <BoutonInstaller />
            <NotificationsCloche />
            <NotificationsPushCloche />
            <Link
              href={lienMonEspace}
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
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
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
