"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { ApplisConnectees } from "@/components/ApplisConnectees";

// Ajoutée le 31/07 (Bourama : "ajoute le bouton applications dans la
// sidebar" -- pas le même bouton que celui de la barre de saisie, qui lui
// sert à EXÉCUTER une action via une appli déjà connectée pendant une
// conversation, voir BarreDeSaisie.tsx. Celui-ci gère la CONNEXION : une
// page qui liste chaque appli, explique ce que l'IA peut y faire, et
// propose de la connecter si ce n'est pas déjà fait.
//
// Simplifiée le 01/08 (nouvelle section "Mon espace" -> Appli connectées,
// même besoin) : la liste + logique de connexion vit maintenant dans
// components/ApplisConnectees.tsx, réutilisée ici et dans
// app/dashboard/espace/page.tsx -- cette page ne garde que son header.

export default function PageApplications() {
  const router = useRouter();
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/connexion");
        return;
      }
      setSession(session);
    });
  }, [router]);

  if (session === undefined) {
    return (
      <>
        <TopBar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-dj-texte-muet">Chargement…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-10">
        <div className="flex items-center gap-3">
          <BoutonRetour />
          <BoutonAccueil />
        </div>

        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold text-dj-texte">
            <LayoutGrid size={22} className="text-dj-accent-1" />
            Applications
          </h1>
          <p className="mt-2 text-sm text-dj-texte-muet">
            Connecte des applications tierces pour que tes IA puissent agir dessus directement
            dans la conversation.
          </p>
        </div>

        <ApplisConnectees />
      </main>
    </>
  );
}

